const { Router } = require('express');
const mongoose = require('mongoose');
const { verifyToken } = require('../middleware/auth');
const Review = require('../models/Review');
const Property = require('../models/Property');

const router = Router();
router.use(verifyToken);

async function recalcRating(property_id) {
  const [agg] = await Review.aggregate([
    { $match: { property_id: new mongoose.Types.ObjectId(property_id) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);
  await Property.findByIdAndUpdate(property_id, {
    avg_rating: agg ? Math.round(agg.avg * 10) / 10 : 0,
    review_count: agg ? agg.count : 0,
  });
}

router.post('/', async (req, res) => {
  try {
    const { property_id, rating, text, tenancy_period } = req.body;
    const user_id = req.user.uid;
    const review = await Review.create({ property_id, user_id, rating, text, tenancy_period });
    await recalcRating(property_id);
    res.status(201).json({ review });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Already reviewed' });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { property_id } = req.query;
    if (!property_id) return res.status(400).json({ error: 'property_id required' });
    const reviews = await Review.find({ property_id }).sort({ createdAt: -1 });
    res.json({ reviews });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const review = await Review.findOne({ _id: req.params.id, user_id: req.user.uid });
    if (!review) return res.status(404).json({ error: 'Not found' });

    if (req.body.rating !== undefined) review.rating = req.body.rating;
    if (req.body.text !== undefined) review.text = req.body.text;
    if (req.body.tenancy_period !== undefined) review.tenancy_period = req.body.tenancy_period;
    await review.save();
    await recalcRating(review.property_id.toString());
    res.json({ review });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({ _id: req.params.id, user_id: req.user.uid });
    if (!review) return res.status(404).json({ error: 'Not found' });
    await recalcRating(review.property_id.toString());
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
