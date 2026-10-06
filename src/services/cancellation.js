// Cancelling a booking and the refund that goes with it — shared by the
// customer cancel endpoint and the admin booking override.

// The customer may cancel until the partner has arrived; after that the
// work is happening and it goes through support/admin instead.
const CUSTOMER_CANCELLABLE = ['searching', 'pending', 'assigned', 'on_way'];
const NOT_CANCELLABLE = ['completed', 'cancelled'];

// No payment gateway yet: UPI/card bookings are treated as paid up front
// (refund owed); cash-on-completion and bookings with no payment step
// (SOS jumpstart, admin phone-ins) have taken no money.
const isPrepaid = (order) => !!order.paymentMethod && order.paymentMethod !== 'cash';

function httpError(status, message) {
  return Object.assign(new Error(message), { status });
}

// Mutates `order` (a Mongoose document) — the caller saves it.
function applyCancellation(order, { by, reason }) {
  if (NOT_CANCELLABLE.includes(order.status)) {
    throw httpError(400, order.status === 'completed' ? 'This booking is already completed and cannot be cancelled.' : 'This booking is already cancelled.');
  }
  if (by === 'customer' && !CUSTOMER_CANCELLABLE.includes(order.status)) {
    throw httpError(400, 'Your partner has already arrived, so this booking can no longer be cancelled in the app. Please contact support.');
  }
  const now = new Date();
  order.status = 'cancelled';
  order.cancellation = { by, reason: String(reason || '').trim().slice(0, 200), at: now };
  // Full amount back for prepaid bookings, as agreed — no cancellation fee.
  order.refund = isPrepaid(order)
    ? { amount: order.amount, method: order.paymentMethod, status: 'pending', initiatedAt: now, processedAt: null, reference: '' }
    : { amount: 0, method: order.paymentMethod || '', status: 'not_required', initiatedAt: now, processedAt: null, reference: '' };
  return order;
}

module.exports = { CUSTOMER_CANCELLABLE, applyCancellation, isPrepaid };
