/**
 * Seed Script - Tạo tài khoản admin mặc định
 * Chạy: npm run seed
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const Agent = require('../models/Agent');
const connectDB = require('../config/db');

async function seed() {
  try {
    await connectDB();

    const existingAdmin = await Agent.findOne({ username: 'admin' });
    if (existingAdmin) {
      console.log('[WARN]  Admin account already exists. Skipping...');
      process.exit(0);
    }

    const admin = await Agent.create({
      username: 'admin',
      password: 'admin123',
      displayName: 'Quản trị viên',
      role: 'admin',
    });

    console.log('[OK] Admin account created successfully!');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    console.log('');
    console.log('[WARN]  Vui lòng đổi mật khẩu sau khi đăng nhập lần đầu!');

    const agent = await Agent.create({
      username: 'agent01',
      password: 'agent123',
      displayName: 'Nhân viên 01',
      role: 'agent',
    });

    console.log('');
    console.log('[OK] Sample agent account created!');
    console.log('   Username: agent01');
    console.log('   Password: agent123');
    console.log('   Role: agent');

    process.exit(0);
  } catch (error) {
    console.error('[ERROR] Seed error:', error.message);
    process.exit(1);
  }
}

seed();
