const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken } = require('../middleware/auth');
const { adminOnly } = require('../middleware/adminOnly');
const Landlord = require('../models/Landlord');
const Property = require('../models/Property');
const Review = require('../models/Review');
const { levenshtein } = require('../utils/levenshtein');

const router = Router();
router.use(verifyToken, adminOnly);

const DUPLICATE_THRESHOLD = 4;

router.get('/landlords/duplicates', async (_req, res) => {
  try {
    const landlords = await Landlord.find({ merged_into: null }).select('name');
    const pairs = [];
    for (let i = 0; i < landlords.length; i++) {
      for (let j = i + 1; j < landlords.length; j++) {
        const dist = levenshtein(landlords[i].name, landlords[j].name);
        if (dist <= DUPLICATE_THRESHOLD) {
          pairs.push({ a: landlords[i], b: landlords[j], distance: dist });
        }
      }
    }
    pairs.sort((x, y) => x.distance - y.distance);
    res.json({ pairs });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/landlords/merge', async (req, res) => {
  try {
    const { canonicalId, duplicateIds } = req.body;
    const dupObjectIds = duplicateIds.map(id => new mongoose.Types.ObjectId(id));
    const canonicalObjectId = new mongoose.Types.ObjectId(canonicalId);

    await Landlord.updateMany(
      { _id: { $in: dupObjectIds } },
      { $set: { merged_into: canonicalObjectId } }
    );
    await Property.updateMany(
      { landlord_id: { $in: dupObjectIds } },
      { $set: { landlord_id: canonicalObjectId } }
    );

    res.json({ merged: duplicateIds.length });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/properties', async (_req, res) => {
  try {
    const properties = await Property.find().populate('landlord_id').sort({ createdAt: -1 });
    res.json({ properties });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/reviews/:id', async (req, res) => {
  try {
    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) return res.status(404).json({ error: 'Not found' });

    const [agg] = await Review.aggregate([
      { $match: { property_id: review.property_id } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);
    await Property.findByIdAndUpdate(review.property_id, {
      avg_rating: agg ? Math.round(agg.avg * 10) / 10 : 0,
      review_count: agg ? agg.count : 0,
    });

    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
