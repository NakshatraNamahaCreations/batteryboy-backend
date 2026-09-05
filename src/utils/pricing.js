// Mirrors src/services/pricing.js on the frontend so quotes and the final
// order total are computed the same way in exactly one place of truth: here.
// The client still shows a live estimate, but the server recomputes the total
// from the submitted draft before saving an order — never trusts a client-sent amount.
const CALL_OUT_DAY = 300;
const CALL_OUT_NIGHT = 600;
const INSTALL_FEE = 250;
const GST_PERCENT = 18;

function servicePrice(service, battery) {
  if (service === 'replacement') return battery?.price ?? 0;
  if (service === 'jumpstart') return 300;
  if (service === 'check') return 0;
  if (service === 'install') return 350;
  if (service === 'scrap') return 0;
  if (service === 'mobile_ev') return 500;
  return 0;
}

function serviceLabel(services) {
  const labels = {
    replacement: 'Battery Replacement',
    jumpstart: 'Jumpstart',
    check: 'Battery Checkup & Maintenance',
    install: 'Battery Installation',
    scrap: 'Scrap Battery Pickup',
    mobile_ev: 'Mobile EV Charging',
  };
  return (services || []).map((s) => labels[s] ?? s).join(' + ');
}

function couponDiscount(code, coupons) {
  if (!code) return 0;
  const found = coupons.find((c) => c.code === String(code).toUpperCase() && c.active);
  return found ? found.discount : 0;
}

// draft: { services: string[], night: boolean, couponCode?: string }
// battery: the selected Battery document (or null for non-replacement services)
// coupons: array of active Coupon documents, looked up by the caller
function computePrice(draft, battery, coupons) {
  const services = draft.services || [];
  const subtotal = services.reduce((sum, s) => sum + servicePrice(s, battery), 0);
  const night = !!draft.night;
  const callout = subtotal > 0 ? (night ? CALL_OUT_NIGHT : CALL_OUT_DAY) : 0;
  const install = services.includes('replacement') ? INSTALL_FEE : 0;
  const savings = services.length > 1 ? 300 : 0;
  const discount = couponDiscount(draft.couponCode, coupons || []);
  const taxable = Math.max(0, subtotal + install - discount);
  const gst = (taxable * GST_PERCENT) / 100;
  const cgst = gst / 2;
  const sgst = gst / 2;
  const total = Math.round(taxable + callout + gst);
  return { subtotal, callout, install, savings, discount, taxable, cgst, sgst, total, night };
}

module.exports = { servicePrice, serviceLabel, couponDiscount, computePrice };
