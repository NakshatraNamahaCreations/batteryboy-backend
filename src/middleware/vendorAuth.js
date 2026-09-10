const jwt = require('jsonwebtoken');

function requireVendor(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Missing or invalid Authorization header' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload.isVendor) return res.status(403).json({ message: 'Partner access required' });
    req.vendorId = payload.sub;
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

module.exports = { requireVendor };
