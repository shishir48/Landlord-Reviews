const { Router } = require('express');
const { verifyToken } = require('../middleware/auth');
const Landlord = require('../models/Landlord');
const { levenshtein } = require('../utils/levenshtein');

const router = Router();
router.use(verifyToken);

router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ landlords: [] });

    const all = await Landlord.find({ merged_into: null }).select('name aliases');
    const ranked = all
      .map(l => ({ landlord: l, dist: levenshtein(q, l.name) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, 3)
      .map(({ landlord }) => landlord);

    res.json({ landlords: ranked });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name required' });

    const alias = name.toLowerCase().trim();
    const landlord = await Landlord.create({ name, aliases: [alias] });
    res.status(201).json({ landlord });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
