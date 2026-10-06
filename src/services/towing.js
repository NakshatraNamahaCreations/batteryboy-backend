const Setting = require('../models/Setting');

// Placeholder rates until the admin sets real ones (Admin > Towing).
const DEFAULT_TOWING_RATES = { baseFare: 1000, perKm: 40 };
const MIN_TRIP_KM = 0.3;
const MAX_TRIP_KM = 300;
// Straight-line distance understates the road; used only when Google's
// Distance Matrix isn't configured or fails.
const ROAD_FACTOR = 1.3;

async function getTowingRates() {
  const doc = await Setting.findOne({ key: 'towing' }).lean();
  return { ...DEFAULT_TOWING_RATES, ...(doc?.value || {}) };
}

async function setTowingRates({ baseFare, perKm }) {
  const value = { baseFare: Number(baseFare), perKm: Number(perKm) };
  await Setting.findOneAndUpdate({ key: 'towing' }, { $set: { value } }, { upsert: true });
  return value;
}

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// Driving distance pickup -> drop. Uses Google's Distance Matrix when
// GOOGLE_MAPS_API_KEY is set on the server, otherwise (or on any failure) a
// straight-line estimate scaled up for roads.
async function tripDistanceKm(from, to) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (key) {
    try {
      const params = new URLSearchParams({ origins: `${from.lat},${from.lng}`, destinations: `${to.lat},${to.lng}`, mode: 'driving', key });
      const res = await fetch(`https://maps.googleapis.com/maps/api/distancematrix/json?${params}`, { signal: AbortSignal.timeout(6000) });
      const data = await res.json();
      const el = data?.rows?.[0]?.elements?.[0];
      if (data.status === 'OK' && el?.status === 'OK' && el.distance?.value != null) {
        return { km: Math.round((el.distance.value / 1000) * 10) / 10, source: 'road' };
      }
    } catch (err) {
      console.warn('[towing] distance matrix failed, using estimate:', err.message);
    }
  }
  return { km: Math.round(haversineKm(from, to) * ROAD_FACTOR * 10) / 10, source: 'estimate' };
}

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

// Validates a towing booking and works out the fare inputs. `services` must
// be exactly ['towing']; pickup is the customer's saved address (must be
// pinned on a map) and drop is { lat, lng, label } chosen on the map.
async function resolveTowing(services, pickupAddress, drop) {
  if (!services.includes('towing')) return null;
  if (services.length !== 1) throw httpError(400, 'Towing is booked on its own — remove the other services.');
  if (!pickupAddress || typeof pickupAddress.lat !== 'number' || typeof pickupAddress.lng !== 'number') {
    throw httpError(400, 'The pickup address needs a map location. Pick it on the map and try again.');
  }
  if (!drop || typeof drop.lat !== 'number' || typeof drop.lng !== 'number' || Math.abs(drop.lat) > 90 || Math.abs(drop.lng) > 180) {
    throw httpError(400, 'Choose where the vehicle should be towed to on the map.');
  }
  const pickup = { lat: pickupAddress.lat, lng: pickupAddress.lng };
  const trip = await tripDistanceKm(pickup, drop);
  if (trip.km < MIN_TRIP_KM) throw httpError(400, 'The drop location is the same as the pickup. Choose the garage or place to tow to.');
  if (trip.km > MAX_TRIP_KM) throw httpError(400, `Towing is available up to ${MAX_TRIP_KM} km. Choose a closer drop location.`);
  const rates = await getTowingRates();
  return {
    drop: { label: String(drop.label || '').trim().slice(0, 200) || 'Drop location', lat: drop.lat, lng: drop.lng },
    tripKm: trip.km,
    distanceSource: trip.source,
    fare: { baseFare: rates.baseFare, perKm: rates.perKm, tripKm: trip.km },
  };
}

module.exports = { DEFAULT_TOWING_RATES, getTowingRates, setTowingRates, tripDistanceKm, resolveTowing, haversineKm };
