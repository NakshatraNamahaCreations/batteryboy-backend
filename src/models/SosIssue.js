const mongoose = require('mongoose');

// Step 1 of the customer app's Roadside SOS: "What is it doing?". Each issue
// carries the diagnosis shown on step 2 and which fixes to offer there.
const sosIssueSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, default: '', trim: true },
    icon: { type: String, default: 'alert-circle-outline', trim: true },
    headline: { type: String, required: true, trim: true },
    copy: { type: String, default: '', trim: true },
    banner: { type: String, default: '', trim: true },
    recommendedFix: { type: String, default: '', trim: true },
    // Fix keys offered for this issue; empty = every active fix.
    fixes: { type: [String], default: [] },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model('SosIssue', sosIssueSchema);
