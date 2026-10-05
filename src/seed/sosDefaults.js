// Starting SOS content — inserted automatically the first time the SOS config
// is requested and the collections are empty, so the admin panel opens with
// the same flow the app used to hardcode. Keep in sync with the app's
// offline fallback (customer app: src/data/sosDefaults.js).

const SOS_FIX_ACTIONS = ['jumpstart_order', 'battery_replacement', 'towing', 'call_support'];

const DEFAULT_FIXES = [
  {
    key: 'replace',
    title: 'Instant battery change',
    description: 'New battery fitted where you stand, old one taken away',
    action: 'battery_replacement',
    etaMins: 12,
    priceLine: 'Exide 45 Ah, 55 month warranty',
    price: 6590,
    order: 1,
  },
  {
    key: 'jumpstart',
    title: 'Jumpstart only',
    description: 'Gets you moving now, does not fix the cause',
    action: 'jumpstart_order',
    etaMins: 12,
    priceLine: 'Credited if you replace this week',
    price: null,
    order: 2,
  },
  {
    key: 'tow',
    title: 'Tow to a garage',
    description: 'If it is not the battery, we move the vehicle',
    action: 'towing',
    etaMins: 26,
    priceLine: 'Paid to the towing partner',
    price: 1800,
    order: 3,
  },
];

const DEFAULT_ISSUES = [
  {
    key: 'nocrank',
    title: 'It will not crank at all',
    subtitle: 'Turn the key and nothing happens',
    icon: 'battery-dead-outline',
    headline: 'Battery is fully dead',
    copy: 'Nothing at all when you turn the key almost always means the battery is fully drained or a terminal has failed. A jumpstart will get you started, but a replacement is the durable fix.',
    recommendedFix: 'replace',
    banner: 'Replacing solves it in one visit. Jumpstart works today but will strand you again within days.',
    order: 1,
  },
  {
    key: 'slow',
    title: 'Cranks slowly, dash lights dim',
    subtitle: 'Struggles then gives up',
    icon: 'flash-outline',
    headline: 'Sounds like a flat battery, not the starter',
    copy: 'A slow crank with the dash lights dimming is the battery giving up under load. A jumpstart will move you today, but it will likely happen again within a week.',
    recommendedFix: 'replace',
    banner: 'Night rate is in the prices above. Pick the jumpstart and we will credit it against a replacement booked the same week.',
    order: 2,
  },
  {
    key: 'died',
    title: 'Died while I was driving',
    subtitle: 'Cut out on the road',
    icon: 'car-outline',
    headline: 'Likely an alternator issue, not the battery',
    copy: 'A vehicle that cuts out while driving is usually the alternator failing, so the battery drained mid-trip. Best to have it towed to a garage that can test both. A jumpstart alone will die again within kilometres.',
    recommendedFix: 'tow',
    banner: 'Towing is the safest call here. The technician can still fit a battery on arrival if it turns out to be that.',
    order: 3,
  },
  {
    key: 'again',
    title: 'Jumpstarted, then died again',
    subtitle: 'Will not hold a charge',
    icon: 'checkmark-circle-outline',
    headline: 'Battery cannot hold a charge anymore',
    copy: 'If a jumpstart only lasts a day, the battery has lost its ability to hold charge. Replacing it is the only durable fix. We will bring the right fitment for your vehicle.',
    recommendedFix: 'replace',
    banner: 'Skip the second jumpstart. A new battery comes with the technician and fits in around 15 minutes.',
    order: 4,
  },
  {
    key: 'unsure',
    title: 'I am not sure what it is',
    subtitle: 'Let the technician diagnose it',
    icon: 'help-circle-outline',
    headline: 'Let the technician diagnose it on arrival',
    copy: 'When you are not sure what it is, the safest call is a jumpstart plus a diagnostic. The technician will test the battery, alternator and terminals before you commit to a replacement.',
    recommendedFix: 'jumpstart',
    banner: 'The jumpstart includes a full diagnostic. If a replacement is needed, the amount is credited against it.',
    order: 5,
  },
];

module.exports = { SOS_FIX_ACTIONS, DEFAULT_FIXES, DEFAULT_ISSUES };
