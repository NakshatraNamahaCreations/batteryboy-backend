const express = require('express');
const { requireVendor } = require('../middleware/vendorAuth');
const { sendOtp, verifyOtp } = require('../controllers/vendorAuthController');
const {
  getMe,
  setStatus,
  updateLocation,
  listOffers,
  acceptOffer,
  declineOffer,
  listJobs,
  updateJobStatus,
  verifyArrivalOtp,
} = require('../controllers/vendorController');

const router = express.Router();

router.post('/auth/send-otp', sendOtp);
router.post('/auth/verify-otp', verifyOtp);

router.use(requireVendor);

router.get('/me', getMe);
router.patch('/status', setStatus);
router.patch('/location', updateLocation);

router.get('/offers', listOffers);
router.post('/offers/:orderId/accept', acceptOffer);
router.post('/offers/:orderId/decline', declineOffer);

router.get('/jobs', listJobs);
router.patch('/jobs/:orderId/status', updateJobStatus);
router.post('/jobs/:orderId/verify-otp', verifyArrivalOtp);

module.exports = router;
