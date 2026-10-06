const mongoose = require('mongoose');
const Order = require('../models/Order');

// Partner earnings, always in India time. The server runs in UTC (Render),
// so "today" must be computed for IST explicitly — otherwise a job finished
// at 2 AM IST would count as yesterday.
const IST_OFFSET_MS = 330 * 60 * 1000;
const IST_TZ = '+05:30';

// When a job counted as earned: completedAt, or updatedAt for jobs completed
// before completedAt was recorded.
const EARNED_AT = { $ifNull: ['$completedAt', '$updatedAt'] };

// 'YYYY-MM-DD' (an IST calendar day) -> the UTC instant that day starts.
function istDayStart(key) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(key || ''));
  if (!m) return null;
  const t = Date.UTC(+m[1], +m[2] - 1, +m[3]) - IST_OFFSET_MS;
  return Number.isNaN(t) ? null : new Date(t);
}

// The IST calendar day a UTC instant falls on, as 'YYYY-MM-DD'.
function istKey(date) {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function addDays(key, n) {
  const d = new Date(`${key}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

function vendorMatch(vendorId, from, to) {
  const match = { vendorId: new mongoose.Types.ObjectId(String(vendorId)), status: 'completed' };
  const conds = [];
  if (from) conds.push({ $gte: [EARNED_AT, from] });
  if (to) conds.push({ $lt: [EARNED_AT, to] });
  return conds.length ? { ...match, $expr: { $and: conds } } : match;
}

async function sumBetween(vendorId, from, to) {
  const [row] = await Order.aggregate([{ $match: vendorMatch(vendorId, from, to) }, { $group: { _id: null, amount: { $sum: '$amount' }, jobs: { $sum: 1 } } }]);
  return { amount: row?.amount || 0, jobs: row?.jobs || 0 };
}

// Totals for the standard periods, in one call.
async function earningsSummary(vendorId, now = new Date()) {
  const today = istKey(now);
  // Week starts on Monday (IST).
  const dow = new Date(`${today}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const weekStart = addDays(today, -((dow + 6) % 7));
  const monthStart = `${today.slice(0, 7)}-01`;
  const yearStart = `${today.slice(0, 4)}-01-01`;
  const tomorrow = istDayStart(addDays(today, 1));
  const [t, y, w, m, yr, all] = await Promise.all([
    sumBetween(vendorId, istDayStart(today), tomorrow),
    sumBetween(vendorId, istDayStart(addDays(today, -1)), istDayStart(today)),
    sumBetween(vendorId, istDayStart(weekStart), tomorrow),
    sumBetween(vendorId, istDayStart(monthStart), tomorrow),
    sumBetween(vendorId, istDayStart(yearStart), tomorrow),
    sumBetween(vendorId, null, null),
  ]);
  return {
    today: t,
    yesterday: y,
    week: w,
    month: m,
    year: yr,
    allTime: all,
    ranges: { today, weekStart, monthStart, yearStart },
  };
}

const MAX_RANGE_DAYS = 366;

// Totals, a day-by-day (or month-by-month for long ranges) breakdown and the
// trips themselves for an inclusive IST date range.
async function earningsRange(vendorId, fromKey, toKey) {
  const from = istDayStart(fromKey);
  const toStart = istDayStart(toKey);
  if (!from || !toStart) throw Object.assign(new Error('from and to must be dates like 2026-10-06'), { status: 400 });
  if (from > toStart) throw Object.assign(new Error('The start date must be on or before the end date'), { status: 400 });
  const days = Math.round((toStart - from) / 86400000) + 1;
  if (days > MAX_RANGE_DAYS) throw Object.assign(new Error(`Choose a range of at most ${MAX_RANGE_DAYS} days`), { status: 400 });
  const to = istDayStart(addDays(toKey, 1));
  const bucket = days > 62 ? 'month' : 'day';
  const fmt = bucket === 'month' ? '%Y-%m' : '%Y-%m-%d';

  const match = vendorMatch(vendorId, from, to);
  const [totals, grouped, trips] = await Promise.all([
    sumBetween(vendorId, from, to),
    Order.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: fmt, date: EARNED_AT, timezone: IST_TZ } }, amount: { $sum: '$amount' }, jobs: { $sum: 1 } } },
    ]),
    Order.aggregate([
      { $match: match },
      { $addFields: { earnedAt: EARNED_AT } },
      { $sort: { earnedAt: -1 } },
      { $limit: 200 },
      { $project: { serviceLabel: 1, vehicleLabel: 1, addressLabel: 1, amount: 1, invoiceNo: 1, earnedAt: 1, tripKm: 1 } },
    ]),
  ]);

  // Every bucket in the range, zero-filled, so the chart has no gaps.
  const byKey = Object.fromEntries(grouped.map((g) => [g._id, g]));
  const series = [];
  if (bucket === 'day') {
    for (let k = fromKey; k <= toKey; k = addDays(k, 1)) series.push({ key: k, amount: byKey[k]?.amount || 0, jobs: byKey[k]?.jobs || 0 });
  } else {
    let [y, mo] = fromKey.split('-').map(Number);
    const end = toKey.slice(0, 7);
    for (;;) {
      const k = `${y}-${String(mo).padStart(2, '0')}`;
      series.push({ key: k, amount: byKey[k]?.amount || 0, jobs: byKey[k]?.jobs || 0 });
      if (k >= end) break;
      mo += 1;
      if (mo > 12) { mo = 1; y += 1; }
    }
  }
  return { from: fromKey, to: toKey, bucket, ...totals, series, trips: trips.map(({ _id, ...t }) => ({ id: _id, ...t })) };
}

module.exports = { earningsSummary, earningsRange, istKey, istDayStart, addDays };
