const { Schema, model } = require('mongoose');

const landlordSchema = new Schema({
  name: { type: String, required: true },
  aliases: [String],
  merged_into: { type: Schema.Types.ObjectId, ref: 'Landlord', default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = model('Landlord', landlordSchema);
