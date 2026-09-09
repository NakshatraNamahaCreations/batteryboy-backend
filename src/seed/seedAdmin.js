// Seeds the first admin login and the service catalog that mirrors what the
// customer app actually ships (src/data/serviceConfig.js, the Home/Greeting
// screens' service list, and src/services/pricing.js's servicePrice()) —
// not an aspirational spec catalog. Safe to re-run — everything is upserted,
// and any previously-seeded category/service outside this set is removed so
// stale placeholder data doesn't linger in the admin panel.
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/db');
const AdminUser = require('../models/AdminUser');
const Category = require('../models/Category');
const Service = require('../models/Service');

const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL || 'admin@batteryboy.in';
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD || 'BatteryBoy@123';

// One category — the app itself has no service-category grouping, it shows
// these 6 services together on Home/Greeting. basePrice for "Battery
// Replacement" is the recommended battery's price (Exide Matrix 45Ah,
// Rs. 5,990 in data/mock.js) — the app always lets the customer pick a
// different battery afterwards, which is what actually determines the price.
const CATALOG = [
  {
    name: 'Battery Boy Services',
    icon: 'battery-charging-outline',
    order: 1,
    services: [
      { name: 'Jumpstart', basePrice: 300, estimatedDurationMins: 20, icon: 'flash', description: 'Quick jumpstart to get you back on the road' },
      {
        name: 'Battery Replacement',
        basePrice: 5990,
        estimatedDurationMins: 30,
        icon: 'battery-charging',
        description: 'New battery delivered and fitted at your doorstep',
      },
      {
        name: 'Battery Installation',
        basePrice: 350,
        estimatedDurationMins: 25,
        icon: 'construct',
        description: 'Professional fitting of a battery you already own',
      },
      {
        name: 'Battery Checkup & Maintenance',
        basePrice: 0,
        estimatedDurationMins: 20,
        icon: 'build',
        description: 'Full service — terminals, topping up, load test',
      },
      {
        name: 'Scrap Battery Pickup',
        basePrice: 0,
        estimatedDurationMins: 20,
        icon: 'refresh-circle-outline',
        description: 'Safe pickup, fair price, eco-friendly recycling',
      },
      {
        name: 'Mobile EV Charging',
        basePrice: 500,
        estimatedDurationMins: 45,
        icon: 'flash-outline',
        description: 'Charging van comes to your EV, wherever it is parked',
      },
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
  const keepCategoryIds = [];
  const keepServiceKeys = []; // `${categoryId}|${name}`

  for (const cat of CATALOG) {
    const category = await Category.findOneAndUpdate(
      { name: cat.name },
      { $set: { name: cat.name, icon: cat.icon, order: cat.order, active: true } },
      { upsert: true, returnDocument: 'after' },
    );
    categoryCount++;
    keepCategoryIds.push(category._id);

    for (const svc of cat.services) {
      await Service.findOneAndUpdate(
        { name: svc.name, categoryId: category._id },
        {
          $set: {
            name: svc.name,
            categoryId: category._id,
            description: svc.description || '',
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
      keepServiceKeys.push(`${category._id}|${svc.name}`);
    }
  }

  // Remove anything seeded by an earlier version of this script (e.g. the
  // placeholder "Tyre Services" / "Repair Services" catalog) that doesn't
  // belong to the real app's service list.
  const staleServices = await Service.deleteMany({
    $expr: { $not: { $in: [{ $concat: [{ $toString: '$categoryId' }, '|', '$name'] }, keepServiceKeys] } },
  });
  const staleCategories = await Category.deleteMany({ _id: { $nin: keepCategoryIds } });

  console.log(`Seeded ${categoryCount} categories, ${serviceCount} services`);
  if (staleServices.deletedCount || staleCategories.deletedCount) {
    console.log(`Removed ${staleCategories.deletedCount} stale categories and ${staleServices.deletedCount} stale services`);
  }
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
