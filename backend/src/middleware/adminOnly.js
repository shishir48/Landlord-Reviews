const User = require('../models/User');

async function adminOnly(req, res, next) {
  try {
    const user = await User.findById(req.user.uid);
    if (!user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
    next();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = { adminOnly };
