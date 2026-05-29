// placeholder, full implementation in Task 4
const { Schema, model } = require('mongoose');
const userSchema = new Schema({ _id: String, email: String, isAdmin: { type: Boolean, default: false } });
module.exports = model('User', userSchema);
