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

async function findNearbyVendorIds({ lng, lat, radiusKm, excludeIds }) {
  const vendors = await Vendor.find({
    online: true,
    verified: true,
    active: true,
    _id: { $nin: excludeIds },
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

function startDispatchSweeper() {
  setInterval(() => {
    sweepStalledDispatches().catch((err) => console.error('[dispatch] sweep error:', err));
  }, SWEEP_INTERVAL_MS);
}

module.exports = { startDispatch, startDispatchSweeper, RING_RADII_KM, RING_WINDOW_MS };
