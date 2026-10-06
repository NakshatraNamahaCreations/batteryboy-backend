// Indian mobile numbers are stored as their 10 digits ("9876543210") — what
// the partner app sends and what existing records use — so "+91 98765 43210",
// "098765-43210" and "9876543210" all resolve to the same account.
function normalizeIndianMobile(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  const ten = digits.length > 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(ten) ? ten : null;
}

module.exports = { normalizeIndianMobile };
