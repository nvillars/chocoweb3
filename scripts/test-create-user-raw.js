// Connect directly with mongoose and create a user with hashed password.
// Usage: node scripts/test-create-user-raw.js [email] [password]
(async function(){
  try{
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.local' });
    const mongoose = require('mongoose');
    const bcrypt = require('bcryptjs');
    const uri = process.env.MONGODB_URI;
    if(!uri) throw new Error('MONGODB_URI not found in .env.local');
    await mongoose.connect(uri);

    const UserSchema = new mongoose.Schema({
      email: { type: String, required: true, unique: true, index: true },
      name: { type: String, required: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ['admin','user'], default: 'user' }
    }, { timestamps: true });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    const email = process.argv[2] || 'test+raw@example.com';
    const password = process.argv[3] || 'secret123';
    const name = 'Raw Test User';
    const existing = await User.findOne({ email }).lean().exec();
    if(existing){
      console.log('User already exists:', existing._id);
      process.exit(0);
    }
    const hash = await bcrypt.hash(password, 10);
    const created = await User.create({ email, name, passwordHash: hash, role: 'user' });
    console.log('Created user:', { id: created._id.toString(), email: created.email });
    // fetch raw document from collection to show stored fields
    const raw = await User.collection.findOne({ _id: created._id });
    console.log('Raw stored document keys:', Object.keys(raw));
    process.exit(0);
  }catch(e){
    console.error('Error:', e);
    process.exit(1);
  }
})();
