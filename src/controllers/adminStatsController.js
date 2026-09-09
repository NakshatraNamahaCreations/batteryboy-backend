const User = require('../models/User');
const Vendor = require('../models/Vendor');
const Order = require('../models/Order');
const Service = require('../models/Service');
const { asyncHandler } = require('../utils/asyncHandler');

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/admin/stats
const getStats = asyncHandler(async (req, res) => {
  const today = startOfToday();
  const activeStatuses = ['pending', 'assigned', 'on_way', 'arrived', 'in_progress'];

  const [
    totalCustomers,
    totalVendors,
    onlineVendors,
    verifiedVendors,
    activeBookings,
    completedToday,
    cancelledToday,
    totalServices,
    revenueAgg,
  ] = await Promise.all([
    User.countDocuments(),
    Vendor.countDocuments(),
    Vendor.countDocuments({ online: true, active: true }),
    Vendor.countDocuments({ verified: true }),
    Order.countDocuments({ status: { $in: activeStatuses } }),
    Order.countDocuments({ status: 'completed', updatedAt: { $gte: today } }),
    Order.countDocuments({ status: 'cancelled', updatedAt: { $gte: today } }),
    Service.countDocuments({ active: true }),
    Order.aggregate([
      { $match: { status: 'completed', updatedAt: { $gte: today } } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]),
  ]);

  const byStatus = await Order.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]);

  res.json({
    totalCustomers,
    totalVendors,
    onlineVendors,
    verifiedVendors,
    activeBookings,
    completedToday,
    cancelledToday,
    revenueToday: revenueAgg[0]?.total ?? 0,
    totalServices,
    bookingsByStatus: byStatus.reduce((acc, r) => ({ ...acc, [r._id]: r.count }), {}),
  });
});

module.exports = { getStats };
