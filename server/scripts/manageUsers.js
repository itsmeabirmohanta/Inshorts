const mongoose = require('mongoose');
const { hashPassword } = require('../utils/security');
const User = require('../models/User');
require('dotenv').config();

const manageUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    const password = process.env.SEED_PASSWORD || 'pass123';
    const hashedPassword = await hashPassword(password);

    const users = await User.find({ regId: { $in: ['student1', 'teacher1'] } });

    if (users.length === 0) {
      const newUsers = [
        { regId: 'student1', password: hashedPassword, role: 'student' },
        { regId: 'teacher1', password: hashedPassword, role: 'teacher' }
      ];
      await User.insertMany(newUsers);
      console.log('✅ Created default users');
    } else {
      await User.updateMany(
        { regId: { $in: ['student1', 'teacher1'] } },
        { $set: { password: hashedPassword } }
      );
      console.log('✅ Updated user passwords');
    }

    console.log('\n📋 Login Credentials:');
    console.log(`   Student: regId=student1, password=${password}`);
    console.log(`   Teacher: regId=teacher1, password=${password}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
};

manageUsers();
