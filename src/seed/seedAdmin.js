// Seeds the first admin login and the starter service catalog (categories +
// services) described in the Battery Boy product spec, so the admin panel
// isn't empty on first login. Safe to re-run — everything is upserted.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const AdminUser = require('../models/AdminUser');
const Category = require('../models/Category');
const Service = require('../models/Service');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@batteryboy.in';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'BatteryBoy@123';

const CATALOG = [
  {
    name: 'Battery Services',
    icon: 'battery-charging-outline',
    order: 1,
    services: [
      { name: 'Jump Start', basePrice: 249, estimatedDurationMins: 20, icon: 'flash-outline' },
      { name: 'Battery Health Check', basePrice: 149, estimatedDurationMins: 15, icon: 'pulse-outline' },
      { name: 'Battery Replacement', basePrice: 3999, estimatedDurationMins: 30, icon: 'battery-full-outline' },
      { name: 'Battery Installation', basePrice: 299, estimatedDurationMins: 25, icon: 'construct-outline' },
      { name: 'Battery Terminal Issue', basePrice: 199, estimatedDurationMins: 15, icon: 'flash-off-outline' },
      { name: 'Battery Charging', basePrice: 249, estimatedDurationMins: 45, icon: 'battery-half-outline' },
    ],
  },
  {
    name: 'Tyre Services',
    icon: 'ellipse-outline',
    order: 2,
    services: [
      { name: 'Flat Tyre Assistance', basePrice: 199, estimatedDurationMins: 25, icon: 'disc-outline' },
      { name: 'Puncture Assistance', basePrice: 149, estimatedDurationMins: 20, icon: 'build-outline' },
      { name: 'Spare Wheel Assistance', basePrice: 199, estimatedDurationMins: 20, icon: 'sync-outline' },
    ],
  },
  {
    name: 'Repair Services',
    icon: 'hammer-outline',
    order: 3,
    services: [
      { name: 'Vehicle Not Starting', basePrice: 249, estimatedDurationMins: 30, icon: 'warning-outline' },
      { name: 'Minor Car Repair', basePrice: 349, estimatedDurationMins: 40, icon: 'car-outline' },
      { name: 'Minor Bike Repair', basePrice: 249, estimatedDurationMins: 30, icon: 'bicycle-outline' },
      { name: 'Electrical Problem', basePrice: 299, estimatedDurationMins: 35, icon: 'flash-outline' },
    ],
  },
  {
    name: 'Towing Services',
    icon: 'car-sport-outline',
    order: 4,
    services: [
      { name: 'Bike Towing', basePrice: 499, estimatedDurationMins: 45, vehicleTypes: ['bike'], icon: 'bicycle-outline' },
      { name: 'Car Towing', basePrice: 999, estimatedDurationMins: 60, vehicleTypes: ['car'], icon: 'car-outline' },
    ],
  },
];

async function seedAdminUser() {
  const existing = await AdminUser.findOne({ email: ADMIN_EMAIL });
  if (existing) {
    console.log(`Admin user already exists: ${ADMIN_EMAIL}`);
    return;
  }
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
  await AdminUser.create({ name: 'Battery Boy Admin', email: ADMIN_EMAIL, passwordHash, role: 'superadmin' });
  console.log(`Created admin user: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD} (change this password after first login)`);
}

async function seedCatalog() {
  let categoryCount = 0;
  let serviceCount = 0;
  for (const cat of CATALOG) {
    const category = await Category.findOneAndUpdate(
      { name: cat.name },
      { $set: { name: cat.name, icon: cat.icon, order: cat.order, active: true } },
      { upsert: true, returnDocument: 'after' },
    );
    categoryCount++;
    for (const svc of cat.services) {
      await Service.findOneAndUpdate(
        { name: svc.name, categoryId: category._id },
        {
          $set: {
            name: svc.name,
            categoryId: category._id,
            basePrice: svc.basePrice,
            estimatedDurationMins: svc.estimatedDurationMins,
            vehicleTypes: svc.vehicleTypes || ['both'],
            icon: svc.icon,
            active: true,
          },
        },
        { upsert: true },
      );
      serviceCount++;
    }
  }
  console.log(`Seeded ${categoryCount} categories, ${serviceCount} services`);
}

async function run() {
  await connectDB();
  await seedAdminUser();
  await seedCatalog();
  console.log('Admin seed complete.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Admin seed failed:', err);
  process.exit(1);
});
