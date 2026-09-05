// Seeds the two global collections (Battery catalog, Coupons) plus one demo
// user with the same vehicles/addresses/orders/warranties/notifications the
// frontend used to ship as static mock data — so the app looks identical the
// first time it talks to the real API. Safe to re-run (everything is upserted
// by a stable natural key).
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Vehicle = require('../models/Vehicle');
const Address = require('../models/Address');
const Battery = require('../models/Battery');
const Order = require('../models/Order');
const Warranty = require('../models/Warranty');
const Coupon = require('../models/Coupon');
const Notification = require('../models/Notification');

const batteries = [
  {
    brand: 'Exide',
    model: 'Matrix MTRED45L',
    capacityAh: 45,
    voltage: 12,
    crankingAmps: 390,
    warrantyMonths: 55,
    price: 5990,
    dimensions: '238 x 129 x 227 mm',
    terminal: 'Left positive',
    recommended: true,
    category: 'four_wheeler',
    image:
      'https://rukminim2.flixcart.com/image/480/480/xif0q/vehicle-battery/d/w/e/12-matrix-red-mtred45l-45-exide-original-imagmh4qjq7brmhx.jpeg?q=90',
  },
  {
    brand: 'Amaron',
    model: 'Flo AAM-FL-0BH45D21L',
    capacityAh: 45,
    voltage: 12,
    crankingAmps: 380,
    warrantyMonths: 60,
    price: 6480,
    category: 'four_wheeler',
    image: 'https://amaron-prod-images.s3.ap-south-1.amazonaws.com/styles/product_detail_img_450x350/s3/product-front-image/B20-Front_4.png?itok=-FnnubBn',
  },
  {
    brand: 'Livguard',
    model: 'LGZH45D21L',
    capacityAh: 45,
    voltage: 12,
    crankingAmps: 360,
    warrantyMonths: 48,
    price: 5240,
    category: 'four_wheeler',
    image: 'https://rukminim2.flixcart.com/image/480/480/k2w6xe80/car-battery/u/d/y/35-l-livguard-original-imafm5gcazahxkd8.jpeg?q=90',
  },
];

const coupons = [
  { code: 'FIRST200', discount: 200, description: 'Rs. 200 off your first fitment' },
  { code: 'FIRST100', discount: 100, description: 'Rs. 100 off your first fitment' },
  { code: 'FLAT50', discount: 50, description: 'Flat Rs. 50 off' },
  { code: 'WELCOME150', discount: 150, description: 'Welcome offer' },
  { code: 'GOA300', discount: 300, description: 'Goa launch offer' },
];

async function upsertBatteries() {
  const docs = [];
  for (const b of batteries) {
    const doc = await Battery.findOneAndUpdate(
      { brand: b.brand, model: b.model },
      { $set: b },
      { upsert: true, returnDocument: 'after' },
    );
    docs.push(doc);
  }
  console.log(`Seeded ${docs.length} batteries`);
  return docs;
}

async function upsertCoupons() {
  for (const c of coupons) {
    await Coupon.findOneAndUpdate({ code: c.code }, { $set: { ...c, active: true } }, { upsert: true });
  }
  console.log(`Seeded ${coupons.length} coupons`);
}

async function upsertDemoUser() {
  const user = await User.findOneAndUpdate(
    { phone: '+91 98450 66466' },
    {
      $set: {
        name: 'Robert Fernandes',
        email: 'robert.f@gmail.com',
        city: 'Porvorim, Goa',
        referralCode: 'ROBERT4471',
      },
    },
    { upsert: true, returnDocument: 'after' },
  );
  console.log(`Seeded demo user ${user.phone} (${user._id})`);
  return user;
}

async function upsertDemoVehicles(user) {
  const specs = [
    { make: 'Maruti Suzuki', model: 'Swift VXi', registration: 'GA 03 P 4471', category: 'four_wheeler', fuel: 'Petrol', year: 2020, batteryAh: 45, health: 38, lastChecked: 'Checked 11 Aug 2026', primary: true },
    { make: 'Mahindra', model: 'Bolero', registration: 'GA 07 K 2290', category: 'commercial', fuel: 'Diesel', year: 2019, batteryAh: 90, health: 81, lastChecked: 'Checked 09 Aug 2026', primary: false },
    { make: 'Honda', model: 'Activa 6G', registration: 'GA 02 J 8815', category: 'two_wheeler', fuel: 'Petrol', year: 2021, batteryAh: 5, health: 70, lastChecked: 'Checked 22 Jul 2026', primary: false },
  ];
  const docs = [];
  for (const v of specs) {
    const doc = await Vehicle.findOneAndUpdate(
      { userId: user._id, registration: v.registration },
      { $set: { ...v, userId: user._id } },
      { upsert: true, returnDocument: 'after' },
    );
    docs.push(doc);
  }
  const primary = docs.find((d) => d.primary);
  if (primary) await User.findByIdAndUpdate(user._id, { primaryVehicleId: primary._id });
  console.log(`Seeded ${docs.length} vehicles for demo user`);
  return docs;
}

async function upsertDemoAddresses(user) {
  const specs = [
    { label: 'Home', line1: 'Flat 402, Aldeia de Goa, Bambolim 403202', line2: 'Near the clubhouse gate.', icon: 'home', isDefault: true },
    { label: 'Work', line1: 'Unit 7, Patto Plaza, Panaji 403001', line2: '', icon: 'briefcase', isDefault: false },
  ];
  const docs = [];
  for (const a of specs) {
    const doc = await Address.findOneAndUpdate(
      { userId: user._id, label: a.label },
      { $set: { ...a, userId: user._id } },
      { upsert: true, returnDocument: 'after' },
    );
    docs.push(doc);
  }
  console.log(`Seeded ${docs.length} addresses for demo user`);
  return docs;
}

async function upsertDemoOrders(user, vehicles) {
  const byModel = (model) => vehicles.find((v) => v.model === model);
  const specs = [
    { invoiceNo: 'BB-2608-4471', services: ['replacement'], serviceLabel: 'Battery Replacement', vehicle: byModel('Swift VXi'), date: '15 Aug 2026', slot: '20:00 - 22:00', addressLabel: 'Flat 402, Aldeia de Goa, Bambolim', amount: 8010, status: 'on_way' },
    { invoiceNo: 'ORD-2311', services: ['check'], serviceLabel: 'Battery Checkup & Maintenance', vehicle: byModel('Swift VXi'), date: '11 Aug 2026', slot: '10:00 - 12:00', addressLabel: 'Home', amount: 0, status: 'completed' },
    { invoiceNo: 'ORD-2307', services: ['jumpstart'], serviceLabel: 'Jumpstart', vehicle: byModel('Bolero'), date: '02 Jul 2026', slot: '09:00 - 11:00', addressLabel: 'Work', amount: 300, status: 'completed' },
    { invoiceNo: 'ORD-2201', services: ['replacement'], serviceLabel: 'Battery Replacement', vehicle: byModel('Bolero'), date: '03 Sep 2022', slot: '11:00 - 13:00', addressLabel: 'Home', amount: 11240, status: 'completed' },
  ];
  let count = 0;
  for (const o of specs) {
    await Order.findOneAndUpdate(
      { userId: user._id, invoiceNo: o.invoiceNo },
      {
        $set: {
          userId: user._id,
          services: o.services,
          serviceLabel: o.serviceLabel,
          vehicleId: o.vehicle?._id ?? null,
          vehicleLabel: o.vehicle ? `${o.vehicle.make} ${o.vehicle.model}` : '',
          addressLabel: o.addressLabel,
          date: o.date,
          slot: o.slot,
          amount: o.amount,
          pricing: { total: o.amount },
          status: o.status,
          invoiceNo: o.invoiceNo,
        },
      },
      { upsert: true },
    );
    count++;
  }
  console.log(`Seeded ${count} orders for demo user`);
}

async function upsertDemoWarranties(user) {
  const specs = [
    { brand: 'Exide', model: 'Matrix MTRED45L', vehicleLabel: 'Maruti Swift VXi', purchasedOn: '12 Feb 2024', expiresOn: '12 Sep 2028', daysLeft: 1020, percentLeft: 62, status: 'active', invoiceNo: 'INV-2402-1121' },
    { brand: 'Amaron', model: 'Pro', vehicleLabel: 'Mahindra Bolero', purchasedOn: '03 Sep 2022', expiresOn: '03 Oct 2026', daysLeft: 51, percentLeft: 14, status: 'expiring', invoiceNo: 'INV-2209-0883' },
    { brand: 'Luminous', model: 'RC 18000', vehicleLabel: 'Home inverter', purchasedOn: '20 Jun 2022', expiresOn: '20 Jun 2026', daysLeft: 0, percentLeft: 0, status: 'expired', invoiceNo: 'INV-2206-0442' },
  ];
  let count = 0;
  for (const w of specs) {
    await Warranty.findOneAndUpdate(
      { userId: user._id, invoiceNo: w.invoiceNo },
      { $set: { ...w, userId: user._id, freeReplacementMonths: 24, proRataMonths: 24 } },
      { upsert: true },
    );
    count++;
  }
  console.log(`Seeded ${count} warranties for demo user`);
}

async function upsertDemoNotifications(user) {
  const specs = [
    { title: 'Sandeep is on the way', message: 'Order BB-2608-4471, ETA 18 minutes', group: 'Today', unread: true },
    { title: 'Night rate is now active', message: 'Bookings after 20:00 carry the night call out', group: 'Today', unread: true },
    { title: 'Warranty expiring in 51 days', message: 'Amaron Pro on your Mahindra Bolero', group: 'Yesterday', unread: false },
    { title: 'Your health certificate is ready', message: 'BB/HC/2608/4471', group: 'Yesterday', unread: false },
  ];
  let count = 0;
  for (const n of specs) {
    const exists = await Notification.findOne({ userId: user._id, title: n.title });
    if (!exists) {
      await Notification.create({ ...n, userId: user._id });
      count++;
    }
  }
  console.log(`Seeded ${count} new notifications for demo user`);
}

async function run() {
  await connectDB();
  await upsertBatteries();
  await upsertCoupons();
  const user = await upsertDemoUser();
  const vehicles = await upsertDemoVehicles(user);
  await upsertDemoAddresses(user);
  await upsertDemoOrders(user, vehicles);
  await upsertDemoWarranties(user);
  await upsertDemoNotifications(user);
  console.log('Seed complete.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
