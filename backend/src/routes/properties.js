const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const Property = require('../models/Property');
const { normalizeAddress } = require('../utils/normalizeAddress');

const router = Router();
router.use(verifyToken);

// Search by address substring — must be before GET / to avoid route conflict
router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    const properties = await Property.find({
      formatted_address: { $regex: q, $options: 'i' },
    }).populate('landlord_id').limit(20);
    res.json({ properties });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { place_id, formatted_address, lat, lng } = req.body;
    const normalized_address = normalizeAddress(formatted_address);

    const filter = place_id ? { place_id } : { normalized_address };
    const existing = await Property.findOne(filter);
    if (existing) return res.status(200).json({ property: existing });

    const property = await Property.create({
      place_id: place_id || null,
      formatted_address,
      normalized_address,
      lat,
      lng,
      createdBy: req.user.uid,
    });
    res.status(201).json({ property });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { place_id, _id } = req.query;
    const filter = _id ? { _id } : place_id ? { place_id } : null;
    if (!filter) return res.status(400).json({ error: 'place_id or _id required' });

    const property = await Property.findOne(filter).populate('landlord_id');
    if (!property) return res.status(404).json({ error: 'Not found' });
    res.json({ property });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
