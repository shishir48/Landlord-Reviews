const { Schema, model } = require('mongoose');

const userSchema = new Schema({
  _id: String,
  email: { type: String, required: true },
  displayName: String,
  isAdmin: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

module.exports = model('User', userSchema);
