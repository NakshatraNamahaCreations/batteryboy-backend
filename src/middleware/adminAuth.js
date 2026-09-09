const jwt = require('jsonwebtoken');

// Separate from the customer requireAuth middleware — admin tokens carry
// { sub, role, isAdmin: true } and are rejected here if that flag is missing,
// so a customer's token can never be replayed against admin routes.
function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ message: 'Missing or invalid Authorization header' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.isAdmin) {
      return res.status(403).json({ message: 'Admin access required' });
    }
    req.adminId = payload.sub;
    req.adminRole = payload.role;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { requireAdmin };
