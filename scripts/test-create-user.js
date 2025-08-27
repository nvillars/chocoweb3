// quick test script to create a user directly via mongoose models
(async function(){
  try{
    const dotenv = require('dotenv');
    dotenv.config({ path: '.env.local' });
    const { connectToDB } = require('../src/lib/mongodb');
    const { getUserModel } = require('../src/models/User');
    // runtime require bcrypt
    const bcrypt = require('bcryptjs');
    await connectToDB();
    const User = getUserModel();
    const email = process.argv[2] || 'test+e2e@example.com';
    const name = 'Test User';
    const password = process.argv[3] || 'secret123';
    const hash = await bcrypt.hash(password, 10);
    const exists = await User.findOne({ email }).lean().exec();
    if(exists){
      console.log('User already exists:', exists._id);
      process.exit(0);
    }
    const created = await User.create({ email, name, passwordHash: hash, role: 'user' });
    console.log('Created user:', { id: created._id, email: created.email, name: created.name });
    process.exit(0);
  }catch(e){
    console.error('Error:', e);
    process.exit(1);
  }
})();
