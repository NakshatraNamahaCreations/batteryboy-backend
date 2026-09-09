const mongoose = require('mongoose');

const adminUserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['superadmin', 'operator'], default: 'operator' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('AdminUser', adminUserSchema);
