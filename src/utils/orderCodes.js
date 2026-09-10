function makeInvoiceNo() {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yy}${mm}-${rand}`;
}

// 4-digit code the customer reads out to the technician on arrival —
// generated the moment the booking is created, not when the technician
// shows up, so it's ready to display immediately in the app.
function makeServiceOtp() {
  return String(Math.floor(1000 + Math.random() * 9000));
}

module.exports = { makeInvoiceNo, makeServiceOtp };
