const OTP_TTL_MS = 5 * 60 * 1000;

// Mock OTP: no SMS provider wired up. The 4-digit code is echoed back in the
// send-otp response and logged server-side so the app is fully testable
// without a Twilio/MSG91 account. Swap generateOtp()/the response shape when
// a real SMS provider is added.
function generateOtp() {
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const expiresAt = new Date(Date.now() + OTP_TTL_MS);
  return { code, expiresAt };
}

function isOtpValid(user, submittedCode) {
  if (!user.otpCode || !user.otpExpiresAt) return false;
  if (user.otpExpiresAt.getTime() < Date.now()) return false;
  return user.otpCode === String(submittedCode).trim();
}

module.exports = { generateOtp, isOtpValid, OTP_TTL_MS };
