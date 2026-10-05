const SosIssue = require('../models/SosIssue');
const SosFix = require('../models/SosFix');
const { asyncHandler } = require('../utils/asyncHandler');
const { DEFAULT_FIXES, DEFAULT_ISSUES, SOS_FIX_ACTIONS } = require('../seed/sosDefaults');

const KEY_RE = /^[a-z0-9][a-z0-9_-]{0,39}$/;

// First run on an empty database: load the flow the app used to hardcode so
// SOS keeps working and the admin starts from real content. Each collection
// is seeded independently so deleting every fix doesn't resurrect issues.
let seeding = null;
async function ensureSeeded() {
  if (!seeding) {
    seeding = (async () => {
      if ((await SosFix.estimatedDocumentCount()) === 0) await SosFix.insertMany(DEFAULT_FIXES, { ordered: false }).catch(() => {});
      if ((await SosIssue.estimatedDocumentCount()) === 0) await SosIssue.insertMany(DEFAULT_ISSUES, { ordered: false }).catch(() => {});
    })().finally(() => {
      seeding = null;
    });
  }
  return seeding;
}

const sorted = { order: 1, createdAt: 1 };

// GET /api/sos/config — public; what the customer app renders.
const getSosConfig = asyncHandler(async (req, res) => {
  await ensureSeeded();
  const [issues, fixes] = await Promise.all([SosIssue.find({ active: true }).sort(sorted), SosFix.find({ active: true }).sort(sorted)]);
  res.json({ issues, fixes });
});

// ----- admin: issues -----

const listSosIssues = asyncHandler(async (req, res) => {
  await ensureSeeded();
  res.json({ issues: await SosIssue.find().sort(sorted) });
});

const ISSUE_FIELDS = ['title', 'subtitle', 'icon', 'headline', 'copy', 'banner', 'recommendedFix', 'fixes', 'order', 'active'];

function pickIssue(body) {
  const out = {};
  for (const f of ISSUE_FIELDS) if (body[f] !== undefined) out[f] = body[f];
  if (out.fixes !== undefined) out.fixes = Array.isArray(out.fixes) ? out.fixes.map(String) : [];
  return out;
}

async function validateIssue(data, existing) {
  const merged = { ...(existing ? existing.toObject() : {}), ...data };
  if (!merged.title?.trim() || !merged.headline?.trim()) return 'Title and diagnosis headline are required';
  if (merged.recommendedFix) {
    const fix = await SosFix.findOne({ key: merged.recommendedFix });
    if (!fix) return `Recommended fix "${merged.recommendedFix}" does not exist`;
    if (merged.fixes?.length && !merged.fixes.includes(merged.recommendedFix)) return 'The recommended fix must be one of the fixes offered for this problem';
  }
  return null;
}

const createSosIssue = asyncHandler(async (req, res) => {
  const key = String(req.body.key || '').trim().toLowerCase();
  if (!KEY_RE.test(key)) return res.status(400).json({ message: 'Key must be lowercase letters, numbers, - or _' });
  if (await SosIssue.exists({ key })) return res.status(400).json({ message: `An SOS problem with key "${key}" already exists` });
  const data = pickIssue(req.body);
  const error = await validateIssue(data);
  if (error) return res.status(400).json({ message: error });
  const issue = await SosIssue.create({ ...data, key });
  res.status(201).json({ issue });
});

const updateSosIssue = asyncHandler(async (req, res) => {
  const issue = await SosIssue.findById(req.params.id);
  if (!issue) return res.status(404).json({ message: 'SOS problem not found' });
  const data = pickIssue(req.body);
  const error = await validateIssue(data, issue);
  if (error) return res.status(400).json({ message: error });
  issue.set(data);
  await issue.save();
  res.json({ issue });
});

const deleteSosIssue = asyncHandler(async (req, res) => {
  const issue = await SosIssue.findByIdAndDelete(req.params.id);
  if (!issue) return res.status(404).json({ message: 'SOS problem not found' });
  res.json({ success: true });
});

// ----- admin: fixes -----

const listSosFixes = asyncHandler(async (req, res) => {
  await ensureSeeded();
  res.json({ fixes: await SosFix.find().sort(sorted) });
});

const FIX_FIELDS = ['title', 'description', 'action', 'etaMins', 'priceLine', 'price', 'order', 'active'];

function pickFix(body) {
  const out = {};
  for (const f of FIX_FIELDS) if (body[f] !== undefined) out[f] = body[f];
  for (const n of ['etaMins', 'price']) if (out[n] === '') out[n] = null;
  return out;
}

const createSosFix = asyncHandler(async (req, res) => {
  const key = String(req.body.key || '').trim().toLowerCase();
  if (!KEY_RE.test(key)) return res.status(400).json({ message: 'Key must be lowercase letters, numbers, - or _' });
  if (await SosFix.exists({ key })) return res.status(400).json({ message: `An SOS fix with key "${key}" already exists` });
  const data = pickFix(req.body);
  if (!data.title?.trim()) return res.status(400).json({ message: 'Title is required' });
  if (!SOS_FIX_ACTIONS.includes(data.action)) return res.status(400).json({ message: `Action must be one of: ${SOS_FIX_ACTIONS.join(', ')}` });
  const fix = await SosFix.create({ ...data, key });
  res.status(201).json({ fix });
});

const updateSosFix = asyncHandler(async (req, res) => {
  const fix = await SosFix.findById(req.params.id);
  if (!fix) return res.status(404).json({ message: 'SOS fix not found' });
  const data = pickFix(req.body);
  if (data.action !== undefined && !SOS_FIX_ACTIONS.includes(data.action)) return res.status(400).json({ message: `Action must be one of: ${SOS_FIX_ACTIONS.join(', ')}` });
  fix.set(data);
  await fix.save();
  res.json({ fix });
});

const deleteSosFix = asyncHandler(async (req, res) => {
  const fix = await SosFix.findById(req.params.id);
  if (!fix) return res.status(404).json({ message: 'SOS fix not found' });
  const usedBy = await SosIssue.find({ recommendedFix: fix.key }).select('title');
  if (usedBy.length) {
    return res.status(400).json({ message: `"${fix.title}" is the recommended fix for: ${usedBy.map((i) => i.title).join(', ')}. Change that first.` });
  }
  await SosIssue.updateMany({ fixes: fix.key }, { $pull: { fixes: fix.key } });
  await fix.deleteOne();
  res.json({ success: true });
});

module.exports = {
  getSosConfig,
  listSosIssues,
  createSosIssue,
  updateSosIssue,
  deleteSosIssue,
  listSosFixes,
  createSosFix,
  updateSosFix,
  deleteSosFix,
};
