// Mirrors the vehicle category + brand/model data the customer app currently
// ships as static files (src/data/categories.js, src/data/vehicleBrands.js)
// into the database, so the admin panel can manage the same catalog the app
// shows. Safe to re-run — everything is upserted by a stable natural key.
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDB } = require('../config/db');
const VehicleCategory = require('../models/VehicleCategory');
const VehicleBrand = require('../models/VehicleBrand');

const MOVING = new Set(['two_wheeler', 'three_wheeler', 'four_wheeler', 'commercial', 'trawler', 'yacht', 'ev']);
const EV_CAPABLE = new Set(['two_wheeler', 'three_wheeler', 'four_wheeler', 'commercial', 'ev']);

const CATEGORIES = [
  { key: 'two_wheeler', label: 'Two Wheeler', subtitle: 'Bikes and scooters', icon: 'bicycle-outline', order: 1 },
  { key: 'three_wheeler', label: 'Three Wheeler', subtitle: 'Autos, e rickshaws, goods carriers', icon: 'car-outline', order: 2 },
  { key: 'four_wheeler', label: 'Four Wheeler', subtitle: 'Cars, SUVs and vans', icon: 'car-sport-outline', order: 3 },
  { key: 'commercial', label: 'Commercial Vehicles', subtitle: 'Trucks, buses and tempos', icon: 'bus-outline', order: 4 },
  { key: 'trawler', label: 'Fishing Trawler', subtitle: 'Deep sea and coastal trawlers', icon: 'boat-outline', order: 5 },
  { key: 'yacht', label: 'Yacht and Boats', subtitle: 'Leisure craft and cabin cruisers', icon: 'boat-outline', order: 6 },
  { key: 'genset', label: 'Gen Set', subtitle: 'Diesel and petrol generators', icon: 'flash-outline', order: 7 },
  { key: 'inverter', label: 'Inverters', subtitle: 'Home backup, 600 VA to 5 kVA', icon: 'battery-charging-outline', order: 8 },
  { key: 'ups', label: 'UPS', subtitle: 'Office, desktop and server backup', icon: 'desktop-outline', order: 9 },
  { key: 'solar', label: 'Solar Batteries', subtitle: 'Rooftop and off grid storage', icon: 'sunny-outline', order: 10 },
  { key: 'ev', label: 'EV Batteries', subtitle: 'Traction packs and modules', icon: 'battery-full-outline', order: 11 },
  { key: 'ev_charging', label: 'EV Mobile Charging', subtitle: 'Charge brought to your vehicle', icon: 'flash-outline', order: 12 },
];

// name, sampleModels (-> models), domain (-> logoDomain)
const BRANDS_BY_CATEGORY = {
  two_wheeler: [
    { name: 'Hero', models: ['Splendor Plus', 'Passion Pro', 'HF Deluxe', 'Glamour'], domain: 'heromotocorp.com' },
    { name: 'Honda', models: ['Activa 6G', 'Shine', 'Unicorn', 'Dio'], domain: 'honda.com' },
    { name: 'Bajaj', models: ['Pulsar 150', 'Pulsar N160', 'Platina', 'CT 100'], domain: 'bajajauto.com' },
    { name: 'TVS', models: ['Jupiter', 'Apache RTR 160', 'Raider', 'XL 100'], domain: 'tvsmotor.com' },
    { name: 'Royal Enfield', models: ['Classic 350', 'Bullet 350', 'Meteor 350', 'Himalayan'], domain: 'royalenfield.com' },
    { name: 'Yamaha', models: ['FZ-S', 'MT-15', 'R15 V4', 'Fascino 125'], domain: 'yamaha-motor.com' },
    { name: 'Suzuki', models: ['Access 125', 'Gixxer', 'Burgman Street', 'Hayate'], domain: 'suzuki.com' },
    { name: 'KTM', models: ['Duke 200', 'Duke 390', 'RC 200', 'Adventure 390'], domain: 'ktm.com' },
    { name: 'Ather', models: ['450X', '450S'], domain: 'atherenergy.com' },
    { name: 'Ola Electric', models: ['S1 Pro', 'S1 Air'], domain: 'olaelectric.com' },
  ],
  three_wheeler: [
    { name: 'Bajaj', models: ['RE Compact', 'Maxima Z', 'Maxima C'], domain: 'bajajauto.com' },
    { name: 'Piaggio', models: ['Ape City+', 'Ape Xtra LDX', 'Ape E-City'], domain: 'piaggio.com' },
    { name: 'Mahindra', models: ['Alfa Load', 'Treo', 'e-Alfa Mini'], domain: 'mahindra.com' },
    { name: 'Atul Auto', models: ['Gemini DZ', 'Rik', 'Elite Plus'], domain: 'atulauto.co.in' },
    { name: 'TVS', models: ['King Deluxe', 'King Kargo'], domain: 'tvsmotor.com' },
  ],
  four_wheeler: [
    { name: 'Maruti Suzuki', models: ['Swift', 'Baleno', 'Wagon R', 'Alto K10', 'Brezza', 'Ertiga', 'Dzire'], domain: 'marutisuzuki.com' },
    { name: 'Hyundai', models: ['Creta', 'i20', 'Venue', 'Verna', 'Aura', 'Grand i10 Nios'], domain: 'hyundai.com' },
    { name: 'Tata Motors', models: ['Nexon', 'Punch', 'Tiago', 'Altroz', 'Harrier', 'Safari'], domain: 'tatamotors.com' },
    { name: 'Mahindra', models: ['Scorpio N', 'XUV700', 'Bolero', 'Thar', 'XUV300', 'XUV400'], domain: 'mahindra.com' },
    { name: 'Toyota', models: ['Innova Crysta', 'Fortuner', 'Glanza', 'Urban Cruiser Hyryder'], domain: 'toyota.com' },
    { name: 'Honda', models: ['City', 'Amaze', 'Elevate', 'Jazz'], domain: 'honda.com' },
    { name: 'Kia', models: ['Seltos', 'Sonet', 'Carens', 'Carnival'], domain: 'kia.com' },
    { name: 'Volkswagen', models: ['Virtus', 'Taigun'], domain: 'volkswagen.com' },
    { name: 'Skoda', models: ['Kushaq', 'Slavia', 'Kodiaq'], domain: 'skoda-auto.com' },
    { name: 'Renault', models: ['Kwid', 'Triber', 'Kiger'], domain: 'renault.com' },
    { name: 'Nissan', models: ['Magnite'], domain: 'nissan.com' },
    { name: 'Ford', models: ['EcoSport', 'Endeavour', 'Figo'], domain: 'ford.com' },
  ],
  commercial: [
    { name: 'Tata Motors', models: ['Ace Gold', 'Ace HT+', 'Intra V30', 'Ultra 1109', 'Signa'], domain: 'tatamotors.com' },
    { name: 'Ashok Leyland', models: ['Dost+', 'Bada Dost', 'Ecomet', 'Boss'], domain: 'ashokleyland.com' },
    { name: 'Mahindra', models: ['Bolero Pikup', 'Jeeto', 'Furio 7', 'Blazo X'], domain: 'mahindra.com' },
    { name: 'Eicher', models: ['Pro 2049', 'Pro 3015', 'Pro 6019'], domain: 'eichertrucksandbuses.com' },
    { name: 'BharatBenz', models: ['1015R', '1217C', '1617R'], domain: 'bharatbenz.com' },
    { name: 'Force Motors', models: ['Traveller', 'Trump 40'], domain: 'forcemotors.com' },
  ],
  trawler: [
    { name: 'Kirloskar Marine', models: ['SL 90', 'SL 130'], domain: 'kirloskaroilengines.com' },
    { name: 'Ashok Leyland Marine', models: ['AL 690', 'AL 4CT'], domain: 'ashokleyland.com' },
    { name: 'Yanmar', models: ['3JH40', '6HA2M'], domain: 'yanmar.com' },
    { name: 'Cummins', models: ['6BT 5.9-M', 'QSB 6.7'], domain: 'cummins.com' },
  ],
  yacht: [
    { name: 'Volvo Penta', models: ['D3', 'D4', 'D6'], domain: 'volvopenta.com' },
    { name: 'Yamaha', models: ['F150', 'F200', 'F250'], domain: 'yamaha-motor.com' },
    { name: 'Suzuki Marine', models: ['DF150', 'DF200'], domain: 'suzukimarine.com' },
    { name: 'Mercury', models: ['Verado 250', 'Pro XS 175'], domain: 'mercurymarine.com' },
  ],
  genset: [
    { name: 'Honda', models: ['EU10i', 'EU22i', 'EM 3000'], domain: 'honda.com' },
    { name: 'Kirloskar', models: ['KG1-7.5AS', 'KG1-15AS', 'KG1-30AS'], domain: 'kirloskaroilengines.com' },
    { name: 'Mahindra Powerol', models: ['10 kVA', '15 kVA', '25 kVA', '62.5 kVA'], domain: 'mahindrapowerol.com' },
    { name: 'Cummins', models: ['C15 D5', 'C22 D5', 'C33 D5'], domain: 'cummins.com' },
    { name: 'Ashok Leyland', models: ['15 kVA', '30 kVA'], domain: 'ashokleyland.com' },
    { name: 'Sudhir', models: ['SP 15', 'SP 30'], domain: 'sudhirpower.com' },
  ],
  inverter: [
    { name: 'Luminous', models: ['Zelio+ 1100', 'iCruze 5.5 kVA', 'Cruze 2 kVA'], domain: 'luminousindia.com' },
    { name: 'Microtek', models: ['UPS EB 1100', 'UPS SEBz 1100', 'Hi-End 2500'], domain: 'microtekdirect.com' },
    { name: 'Su-Kam', models: ['Falcon Eco 900', 'Shiny 900'], domain: 'sukam.com' },
    { name: 'V-Guard', models: ['Smart Pro 1200', 'Smart 1150'], domain: 'vguard.in' },
    { name: 'Exide', models: ['6LMS 850', '6LMS 1500'], domain: 'exideindustries.com' },
    { name: 'APC', models: ['1100 VA', '1500 VA'], domain: 'apc.com' },
  ],
  ups: [
    { name: 'APC', models: ['Back-UPS 600', 'Smart-UPS 1500'], domain: 'apc.com' },
    { name: 'Numeric', models: ['Digital 600', 'HP 1 kVA'], domain: 'numericups.com' },
    { name: 'Luminous', models: ['LB 600', 'Optima 1200'], domain: 'luminousindia.com' },
    { name: 'V-Guard', models: ['Sesto 600', 'Prime 1050'], domain: 'vguard.in' },
  ],
  solar: [
    { name: 'Luminous', models: ['LPTT 12150H', 'ILTT 24048'], domain: 'luminousindia.com' },
    { name: 'Exide', models: ['Solar 6LMS 150L', 'Solar 6LMS 200L'], domain: 'exideindustries.com' },
    { name: 'Amara Raja', models: ['Amaron Solar 150 Ah', 'Amaron Solar 200 Ah'], domain: 'amararaja.com' },
    { name: 'Vision', models: ['6FM 100', '6FM 200'], domain: 'vision-batt.com' },
  ],
  ev: [
    { name: 'Tata Motors', models: ['Nexon EV', 'Tigor EV', 'Punch EV'], domain: 'tatamotors.com' },
    { name: 'Mahindra', models: ['XUV400', 'eVerito', 'e2o Plus'], domain: 'mahindra.com' },
    { name: 'MG Motor', models: ['ZS EV', 'Comet EV'], domain: 'mgmotor.co.in' },
    { name: 'Hyundai', models: ['Kona Electric', 'Ioniq 5'], domain: 'hyundai.com' },
    { name: 'BYD', models: ['Atto 3', 'e6'], domain: 'byd.com' },
    { name: 'Ather', models: ['450X', '450S'], domain: 'atherenergy.com' },
    { name: 'Ola Electric', models: ['S1 Pro', 'S1 Air'], domain: 'olaelectric.com' },
  ],
  ev_charging: [
    { name: 'Tata Power', models: ['EZ Charge 7 kW', 'EZ Charge 22 kW'], domain: 'tatapower.com' },
    { name: 'Statiq', models: ['3.3 kW AC', '7.4 kW AC'], domain: 'statiq.in' },
    { name: 'ChargeZone', models: ['Bharat DC001'], domain: 'chargezone.co' },
  ],
};

// Mobile EV Charging shows a different, EV-only brand list per category.
const EV_ONLY_BRANDS_BY_CATEGORY = {
  two_wheeler: [
    { name: 'Ather (EV)', models: ['450X', '450S', 'Rizta'], domain: 'atherenergy.com' },
    { name: 'Ola Electric (EV)', models: ['S1 Pro', 'S1 Air', 'S1 X'], domain: 'olaelectric.com' },
    { name: 'TVS (EV)', models: ['iQube', 'iQube ST'], domain: 'tvsmotor.com' },
    { name: 'Bajaj (EV)', models: ['Chetak Premium', 'Chetak Urbane'], domain: 'bajajauto.com' },
    { name: 'Ampere (EV)', models: ['Magnus EX', 'Zeal EX'], domain: 'amperevehicles.com' },
    { name: 'Hero Electric (EV)', models: ['Optima CX', 'Photon HX'], domain: 'heroelectric.in' },
  ],
  three_wheeler: [
    { name: 'Mahindra (EV)', models: ['Treo', 'Treo Zor', 'e-Alfa Mini'], domain: 'mahindra.com' },
    { name: 'Piaggio (EV)', models: ['Ape E-City'], domain: 'piaggio.co.in' },
    { name: 'Bajaj (EV)', models: ['RE Electric'], domain: 'bajajauto.com' },
    { name: 'YC Electric', models: ['Yatri Deluxe', 'Yatri Super'], domain: 'ycelectric.com' },
  ],
  four_wheeler: [
    { name: 'Tata Motors (EV)', models: ['Nexon EV', 'Tigor EV', 'Punch EV', 'Curvv EV'], domain: 'tatamotors.com' },
    { name: 'Mahindra (EV)', models: ['XUV400', 'BE 6', 'XEV 9e'], domain: 'mahindra.com' },
    { name: 'MG Motor (EV)', models: ['ZS EV', 'Comet EV', 'Windsor EV'], domain: 'mgmotor.co.in' },
    { name: 'Hyundai (EV)', models: ['Kona Electric', 'Ioniq 5'], domain: 'hyundai.com' },
    { name: 'BYD (EV)', models: ['Atto 3', 'Seal', 'e6'], domain: 'byd.com' },
    { name: 'Kia (EV)', models: ['EV6', 'EV9'], domain: 'kia.com' },
    { name: 'Citroen (EV)', models: ['eC3'], domain: 'citroen.in' },
  ],
  commercial: [
    { name: 'Tata Motors (EV)', models: ['Ace EV', 'Xpres-T EV'], domain: 'tatamotors.com' },
    { name: 'Mahindra (EV)', models: ['Treo Zor', 'e-Verito Cargo'], domain: 'mahindra.com' },
    { name: 'Ashok Leyland (EV)', models: ['Boss EV', 'Circuit EV'], domain: 'ashokleyland.com' },
  ],
  ev: [
    { name: 'Ather (EV)', models: ['450X', '450S'], domain: 'atherenergy.com' },
    { name: 'Ola Electric (EV)', models: ['S1 Pro', 'S1 Air'], domain: 'olaelectric.com' },
  ],
};

async function seedCategories() {
  const map = {};
  for (const cat of CATEGORIES) {
    const doc = await VehicleCategory.findOneAndUpdate(
      { key: cat.key },
      {
        $set: {
          ...cat,
          movingVehicle: MOVING.has(cat.key),
          evCapable: EV_CAPABLE.has(cat.key),
        },
      },
      { upsert: true, returnDocument: 'after' },
    );
    map[cat.key] = doc;
  }
  console.log(`Seeded ${CATEGORIES.length} vehicle categories`);
  return map;
}

async function seedBrands(categoryMap, table, evOnly, label) {
  let count = 0;
  for (const [categoryKey, brands] of Object.entries(table)) {
    const category = categoryMap[categoryKey];
    if (!category) continue;
    for (let i = 0; i < brands.length; i++) {
      const b = brands[i];
      await VehicleBrand.findOneAndUpdate(
        { name: b.name, categoryId: category._id, evOnly },
        {
          $set: {
            name: b.name,
            categoryId: category._id,
            logoDomain: b.domain || '',
            evOnly,
            models: b.models.map((name, order) => ({ name, order })),
            order: i,
            active: true,
          },
        },
        { upsert: true },
      );
      count++;
    }
  }
  console.log(`Seeded ${count} ${label} brands`);
}

async function run() {
  await connectDB();
  const categoryMap = await seedCategories();
  await seedBrands(categoryMap, BRANDS_BY_CATEGORY, false, 'standard');
  await seedBrands(categoryMap, EV_ONLY_BRANDS_BY_CATEGORY, true, 'EV-only');
  console.log('Vehicle catalog seed complete.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Vehicle catalog seed failed:', err);
  process.exit(1);
});
