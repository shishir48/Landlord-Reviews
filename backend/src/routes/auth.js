const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const User = require('../models/User');

const router = Router();

router.post('/login', verifyToken, async (req, res) => {
  try {
    const { uid, email, name } = req.user;
    const user = await User.findByIdAndUpdate(
      uid,
      { $setOnInsert: { _id: uid, email, displayName: name, isAdmin: false } },
      { upsert: true, new: true }
    );
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
