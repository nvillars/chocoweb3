/**
 * Promote a user to admin by email.
 * Usage: node scripts/promote-user-to-admin.js user@example.com
 * Requires: .env.local with MONGODB_URI
 * This script performs a direct DB update; use it only from a trusted environment.
 */
(async function(){
  try{
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.local' });
    const mongoose = require('mongoose');
    const uri = process.env.MONGODB_URI;
    if(!uri) throw new Error('MONGODB_URI not found in .env.local');
    await mongoose.connect(uri);

    const UserSchema = new mongoose.Schema({}, { strict: false });
    const User = mongoose.models.User || mongoose.model('User', UserSchema, 'users');

    const email = process.argv[2];
    if(!email) {
      console.error('Usage: node scripts/promote-user-to-admin.js user@example.com');
      process.exit(2);
    }

    const user = await User.findOne({ email }).exec();
    if(!user) {
      console.error('User not found for email:', email);
      process.exit(1);
    }

    if(user.role === 'admin') {
      console.log('User is already admin:', email);
      process.exit(0);
    }

    user.role = 'admin';
    await user.save();
    console.log('Promoted to admin:', email);
    process.exit(0);
  }catch(e){
    console.error('Error:', e);
    process.exit(1);
  }
})();
