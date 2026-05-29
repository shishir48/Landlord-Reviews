const { Schema, model } = require('mongoose');

const reviewSchema = new Schema({
  property_id: { type: Schema.Types.ObjectId, ref: 'Property', required: true },
  user_id: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, required: true },
  tenancy_period: {
    from: Date,
    to: Date,
  },
}, { timestamps: { createdAt: true, updatedAt: false } });

reviewSchema.index({ property_id: 1, user_id: 1 }, { unique: true });

module.exports = model('Review', reviewSchema);
