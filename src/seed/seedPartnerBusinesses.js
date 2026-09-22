require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const PartnerBusiness = require('../models/PartnerBusiness');

// One-time migration of the puncture/towing directory that used to live as
// hardcoded mock data (src/data/mock.js on the customer app) into the DB, so
// the admin panel has something to edit and the app can start reading from
// the API instead. Safe to re-run — upserts by (type, name).
const PUNCTURE_SHOPS = [
  { name: 'Bambolim Tyre Works', lat: 15.4820, lng: 73.8555, rating: 4.6, priceFrom: 150, status: 'open', phone: '+918322451234' },
  { name: 'Panaji Puncture Point', lat: 15.4909, lng: 73.8278, rating: 4.3, priceFrom: 120, status: 'open', phone: '+918322459876' },
  { name: 'Goa Velha Auto Care', lat: 15.5039, lng: 73.9115, rating: 4.8, priceFrom: 180, status: 'closed', phone: '+918322465432' },
];

const TOWING_PARTNERS = [
  { name: 'Coastal Recovery', lat: 15.4909, lng: 73.8278, phone: '+918322411001', priceFrom: 600 },
  { name: 'Goa 24x7 Towing', lat: 15.5057, lng: 73.9115, phone: '+918322422002', priceFrom: 750 },
  { name: 'Mandovi Breakdown', lat: 15.5937, lng: 73.8140, phone: '+918322433003', priceFrom: 550 },
  { name: 'South Goa Recovery', lat: 15.2732, lng: 73.9581, phone: '+918322444004', priceFrom: 700 },
];

async function seedPartnerBusinesses() {
  let count = 0;
  for (const [i, s] of PUNCTURE_SHOPS.entries()) {
    await PartnerBusiness.findOneAndUpdate(
      { type: 'puncture', name: s.name },
      { $set: { type: 'puncture', ...s, order: i } },
      { upsert: true },
    );
    count++;
  }
  for (const [i, t] of TOWING_PARTNERS.entries()) {
    await PartnerBusiness.findOneAndUpdate(
      { type: 'towing', name: t.name },
      { $set: { type: 'towing', status: 'open', ...t, order: i } },
      { upsert: true },
    );
    count++;
  }
  console.log(`Seeded ${count} partner businesses (${PUNCTURE_SHOPS.length} puncture, ${TOWING_PARTNERS.length} towing)`);
}

async function run() {
  await connectDB();
  await seedPartnerBusinesses();
  console.log('Partner business seed complete.');
  await mongoose.disconnect();
}

if (require.main === module) {
  run().catch((err) => {
    console.error('Partner business seed failed:', err);
    process.exit(1);
  });
}

module.exports = { seedPartnerBusinesses };
