const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const AdminUser = require('../models/AdminUser');
const { asyncHandler } = require('../utils/asyncHandler');

function serializeAdmin(admin) {
  return { id: admin._id, name: admin.name, email: admin.email, role: admin.role };
}

// POST /api/admin/auth/login { email, password }
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  const admin = await AdminUser.findOne({ email: email.trim().toLowerCase() });
  if (!admin) return res.status(401).json({ message: 'Invalid email or password' });

  const ok = await bcrypt.compare(password, admin.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid email or password' });

  const token = jwt.sign({ sub: admin._id.toString(), role: admin.role, isAdmin: true }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
  res.json({ token, admin: serializeAdmin(admin) });
});

// GET /api/admin/auth/me
const me = asyncHandler(async (req, res) => {
  const admin = await AdminUser.findById(req.adminId);
  if (!admin) return res.status(404).json({ message: 'Admin not found' });
  res.json({ admin: serializeAdmin(admin) });
});

module.exports = { login, me };
