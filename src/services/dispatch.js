// Ring-based dispatch: broadcast a new booking to every online, verified
// partner within a radius. If nobody accepts within the time window, widen
// the radius and try again — up to 3 rings. First partner to accept wins
// (Order.vendorId is claimed with an atomic findOneAndUpdate, see
// vendorController.acceptOffer, so two partners can never both win the same job).
//
// Timers live in this process's memory (setTimeout) — a restart mid-dispatch,
// or a ring exhausting with nobody online yet, used to strand the order in
// 'searching' forever with no further offers. sweepStalledDispatches() below
// is the safety net: it runs on an interval and re-broadcasts (at the
// widest radius) to any 'searching' order whose ring has expired with no
// newer timer picking it up — so a partner who comes online *after* the
// original 90s window still gets offered the job.
const Order = require('../models/Order');
const Vendor = require('../models/Vendor');
const Address = require('../models/Address');

const RING_RADII_KM = [4, 8, 12];
const RING_WINDOW_MS = 30 * 1000;
const SWEEP_INTERVAL_MS = 20 * 1000;

// A job a partner has accepted and not yet finished.
const ACTIVE_JOB_STATUSES = ['assigned', 'on_way', 'arrived', 'in_progress'];

// A tow truck handles one tow at a time: towing partners with an unfinished
// job get no new offers until it's completed (or cancelled).
async function busyVendorIds() {
  return Order.distinct('vendorId', { status: { $in: ACTIVE_JOB_STATUSES }, vendorId: { $ne: null } });
}

// Towing jobs go only to towing partners; every other job only to the
// battery/mechanic partners (a tow truck can't fit a battery and vice versa).
function vendorTypeFilterFor(services) {
  return (services || []).includes('towing') ? 'towing_provider' : { $ne: 'towing_provider' };
}

async function findNearbyVendorIds({ lng, lat, radiusKm, excludeIds, services }) {
  const isTow = (services || []).includes('towing');
  const busy = isTow ? await busyVendorIds() : [];
  const vendors = await Vendor.find({
    online: true,
    verified: true,
    active: true,
    vendorType: vendorTypeFilterFor(services),
    _id: { $nin: [...excludeIds, ...busy] },
    location: {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: radiusKm * 1000,
      },
    },
  }).select('_id');
  return vendors.map((v) => v._id);
}

// Kicks off ring 1 right after an order is created. Safe to call even if the
// order has no resolvable address coordinates — dispatch just won't find
// anyone and stays in 'searching' for the admin to assign manually.
async function startDispatch(orderId) {
  const order = await Order.findById(orderId);
  if (!order || order.status !== 'searching') return;

  const address = order.addressId ? await Address.findById(order.addressId) : null;
  if (!address || address.lat == null || address.lng == null) {
    console.warn(`[dispatch] order ${orderId} has no geocoded address — skipping auto-dispatch, needs manual assignment`);
    return;
  }

  await runRing(orderId, { lng: address.lng, lat: address.lat }, 1);
}

async function runRing(orderId, center, ringNumber) {
  const order = await Order.findById(orderId);
  if (!order || order.status !== 'searching' || order.vendorId) return; // already claimed or cancelled

  const radiusKm = RING_RADII_KM[ringNumber - 1];
  if (!radiusKm) {
    console.log(`[dispatch] order ${orderId} exhausted all rings with no acceptance — left as 'searching' for manual dispatch`);
    return;
  }

  const alreadyOffered = order.dispatch.offeredVendorIds || [];
  const newVendorIds = await findNearbyVendorIds({
    lng: center.lng,
    lat: center.lat,
    radiusKm,
    excludeIds: alreadyOffered,
    services: order.services,
  });

  const now = new Date();
  order.status = 'searching';
  order.dispatch.ring = ringNumber;
  order.dispatch.ringRadiusKm = radiusKm;
  order.dispatch.startedAt = order.dispatch.startedAt || now;
  order.dispatch.ringExpiresAt = new Date(now.getTime() + RING_WINDOW_MS);
  order.dispatch.offeredVendorIds = [...alreadyOffered, ...newVendorIds];
  await order.save();

  console.log(
    `[dispatch] order ${orderId} ring ${ringNumber} (${radiusKm}km): offered to ${newVendorIds.length} new partner(s), ${order.dispatch.offeredVendorIds.length} total`,
  );

  setTimeout(() => {
    runRing(orderId, center, ringNumber + 1).catch((err) => console.error(`[dispatch] ring escalation failed for ${orderId}:`, err));
  }, RING_WINDOW_MS);
}

// Re-broadcasts at the widest ring to a 'searching' order that still has no
// vendorId, once its current ring has expired with nothing picking it up —
// covers a partner going online after the original window, and a server
// restart that wiped the in-memory setTimeout chain.
async function sweepStalledDispatches() {
  const stuck = await Order.find({
    status: 'searching',
    vendorId: null,
    $or: [{ 'dispatch.ringExpiresAt': null }, { 'dispatch.ringExpiresAt': { $lte: new Date() } }],
  });

  for (const order of stuck) {
    try {
      const address = order.addressId ? await Address.findById(order.addressId) : null;
      if (!address || address.lat == null || address.lng == null) continue;
      const nextRing = order.dispatch.ring < RING_RADII_KM.length ? order.dispatch.ring + 1 : RING_RADII_KM.length;
      await runRing(order._id, { lng: address.lng, lat: address.lat }, nextRing);
    } catch (err) {
      console.error(`[dispatch] sweep failed for order ${order._id}:`, err);
    }
  }
}

// The moment a towing partner is free (finished or lost their job, or just
// went on duty), offer them tows already waiting nearby that skipped them
// while they were busy — instead of making both wait for the next sweep.
async function offerWaitingTowsTo(vendorId) {
  const vendor = await Vendor.findById(vendorId);
  if (!vendor || vendor.vendorType !== 'towing_provider' || !vendor.online || !vendor.verified || !vendor.active) return 0;
  const [lng, lat] = vendor.location?.coordinates || [0, 0];
  if (!lng && !lat) return 0;
  if (await Order.exists({ vendorId: vendor._id, status: { $in: ACTIVE_JOB_STATUSES } })) return 0;
  const maxKm = RING_RADII_KM[RING_RADII_KM.length - 1];
  const waiting = await Order.find({
    status: 'searching',
    vendorId: null,
    services: 'towing',
    'dispatch.offeredVendorIds': { $ne: vendor._id },
    'dispatch.declinedVendorIds': { $ne: vendor._id },
  })
    .select('_id addressId')
    .populate('addressId', 'lat lng');
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const ids = waiting
    .filter((o) => {
      const a = o.addressId;
      if (a?.lat == null || a?.lng == null) return false;
      const dLat = toRad(a.lat - lat);
      const dLng = toRad(a.lng - lng);
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat)) * Math.cos(toRad(a.lat)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(h))) <= maxKm;
    })
    .map((o) => o._id);
  if (!ids.length) return 0;
  const res = await Order.updateMany({ _id: { $in: ids }, status: 'searching', vendorId: null }, { $addToSet: { 'dispatch.offeredVendorIds': vendor._id } });
  return res.modifiedCount || 0;
}

function startDispatchSweeper() {
  setInterval(() => {
    sweepStalledDispatches().catch((err) => console.error('[dispatch] sweep error:', err));
  }, SWEEP_INTERVAL_MS);
}

module.exports = { startDispatch, startDispatchSweeper, vendorTypeFilterFor, offerWaitingTowsTo, ACTIVE_JOB_STATUSES, RING_RADII_KM, RING_WINDOW_MS };
