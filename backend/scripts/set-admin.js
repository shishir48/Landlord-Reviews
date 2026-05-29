#!/usr/bin/env node
/**
 * One-time script to grant admin access to a user by email.
 * Usage: MONGODB_URI=<uri> node scripts/set-admin.js user@example.com
 */
require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node scripts/set-admin.js <email>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/landlord-reviews';

mongoose.connect(uri).then(async () => {
  const result = await User.findOneAndUpdate(
    { email },
    { $set: { isAdmin: true } },
    { new: true }
  );
  if (!result) {
    console.error(`User with email "${email}" not found. They must log in first.`);
    process.exit(1);
  }
  console.log(`Admin granted to: ${result.email} (uid: ${result._id})`);
  process.exit(0);
}).catch(err => {
  console.error('DB connection failed:', err.message);
  process.exit(1);
});
