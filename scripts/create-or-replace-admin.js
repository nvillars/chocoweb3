/**
 * Create or replace an admin user by email and password.
 * Usage: node scripts/create-or-replace-admin.js email@example.com Password123
 * Requires: .env.local with MONGODB_URI
 */
(async function(){
  try{
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.local' });
    const mongoose = require('mongoose');
    const bcrypt = require('bcryptjs');

    const uri = process.env.MONGODB_URI;
    if(!uri) throw new Error('MONGODB_URI not found in .env.local');
    await mongoose.connect(uri);

    const email = process.argv[2];
    const newPass = process.argv[3];
    if(!email || !newPass) {
      console.error('Usage: node scripts/create-or-replace-admin.js email@example.com Password');
      process.exit(2);
    }

    const Users = mongoose.connection.collection('users');

    const hash = await bcrypt.hash(newPass, 10);

    const now = new Date();
    const update = {
      $set: {
        email,
        name: 'Admin ' + email.split('@')[0],
        passwordHash: hash,
        role: 'admin',
        updatedAt: now,
        createdAt: now
      }
    };

    // upsert the user document
    const res = await Users.findOneAndUpdate({ email }, update, { upsert: true, returnDocument: 'after' });
    const doc = res.value;
    if (!doc) {
      console.error('Failed to create or update admin user');
      process.exit(1);
    }
    console.log('Admin user created/updated:', doc.email);
    process.exit(0);
  }catch(e){
    console.error('Error:', e);
    process.exit(1);
  }
})();
