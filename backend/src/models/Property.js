const { Schema, model } = require('mongoose');

const propertySchema = new Schema({
  place_id: { type: String, unique: true, sparse: true },
  formatted_address: { type: String, required: true },
  normalized_address: String,
  lat: Number,
  lng: Number,
  landlord_id: { type: Schema.Types.ObjectId, ref: 'Landlord' },
  avg_rating: { type: Number, default: 0 },
  review_count: { type: Number, default: 0 },
  createdBy: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = model('Property', propertySchema);
