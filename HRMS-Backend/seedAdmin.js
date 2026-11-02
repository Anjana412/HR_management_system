import './env.js';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import User from './models/user.js';

const { url, ADMIN_NAME, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!url || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Set url, ADMIN_EMAIL and ADMIN_PASSWORD in .env first');
  process.exit(1);
}

await mongoose.connect(url);

const existing = await User.findOne({ usertype: 'admin' });
if (existing) {
  console.log('Admin already exists:', existing.email);
} else {
  await User.create({
    name: ADMIN_NAME || 'Admin',
    email: ADMIN_EMAIL,
    password: await bcrypt.hash(ADMIN_PASSWORD, 10),
    usertype: 'admin',
    employmentstatus: 'Active',
  });
  console.log('Admin created:', ADMIN_EMAIL);
}

await mongoose.disconnect();
