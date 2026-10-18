const mongoose = require('mongoose');
require('dotenv').config();

const User = require('../models/user');

async function migrate() {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  try {
    await mongoose.connect(uri);
    console.log('Connected');

    const r1 = await User.updateMany({ role: { $in: ['agent', 'fleet_manager'] } }, { $set: { role: 'agency_manager' } });
    console.log('agent/fleet_manager -> agency_manager:', r1.modifiedCount);
    const r2 = await User.updateMany({ role: { $in: ['finance_manager', 'support', 'customer'] } }, { $set: { role: 'user' } });
    console.log('finance_manager/support/customer -> user:', r2.modifiedCount);

    await mongoose.connection.close();
    console.log('Done');
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

migrate();
