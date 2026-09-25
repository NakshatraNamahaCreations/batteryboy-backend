const express = require('express');
const { requireVendor } = require('../middleware/vendorAuth');
const { sendOtp, verifyOtp } = require('../controllers/vendorAuthController');
const {
  getMe,
  updateMe,
  setStatus,
  updateLocation,
  listOffers,
  acceptOffer,
  declineOffer,
  listJobs,
  updateJobStatus,
  verifyArrivalOtp,
  getEarningsSummary,
} = require('../controllers/vendorController');
const { chatHandlers } = require('../controllers/chatController');

const router = express.Router();
const chat = chatHandlers('vendor');

router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);

router.use(requireVendor);

router.get('/me', getMe);
router.patch('/me', updateMe);
router.patch('/status', setStatus);
router.patch('/location', updateLocation);

router.get('/offers', listOffers);
router.post('/offers/:orderId/accept', acceptOffer);
router.post('/offers/:orderId/decline', declineOffer);

router.get('/earnings', getEarningsSummary);
router.get('/jobs', listJobs);
router.patch('/jobs/:orderId/status', updateJobStatus);
router.post('/jobs/:orderId/verify-otp', verifyArrivalOtp);

// Partner <-> customer chat for a job they're assigned to.
router.get('/jobs/:orderId/messages/unread', chat.unread);
router.get('/jobs/:orderId/messages', chat.list);
router.post('/jobs/:orderId/messages', chat.send);

module.exports = router;
