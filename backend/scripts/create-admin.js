require('dotenv').config();
const { pool, initDatabase } = require('../db/connection');
const User = require('../models/User');

const createAdminUser = async () => {
  try {
    console.log('🔧 Creating admin user...');
    
    // Initialize database schema first
    await initDatabase();
    
    const username = 'Admin2';
    const password = 'admin123';
    
    // Check if user already exists
    const existingUser = await User.findByUsername(username);
    
    if (existingUser) {
      console.log(`⚠️  User '${username}' already exists.`);
      console.log('   To reset the password, delete the user first from the database.');
      process.exit(0);
    }
    
    // Create the admin user
    console.log(`   Creating admin user: ${username}`);
    const user = await User.create({
      username,
      password,
      is_admin: true
    });
    
    console.log('✅ Admin user created successfully!');
    console.log(`\n📋 Login Credentials:`);
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    console.error('   Details:', error.message);
    process.exit(1);
  }
};

createAdminUser();

