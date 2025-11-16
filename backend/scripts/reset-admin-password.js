require('dotenv').config();
const { pool, initDatabase } = require('../db/connection');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const resetAdminPassword = async () => {
  try {
    console.log('🔧 Resetting Admin2 password...');
    
    // Initialize database schema first
    await initDatabase();
    
    const username = 'Admin2';
    const password = 'admin123';
    
    // Check if user exists
    const existingUser = await User.findByUsername(username);
    
    if (!existingUser) {
      console.log(`⚠️  User '${username}' does not exist. Creating it...`);
      const user = await User.create({
        username,
        password,
        is_admin: true,
        can_draw: true  // Admins get drawing privileges by default
      });
      console.log('✅ Admin user created successfully!');
    } else {
      console.log(`   Found existing user: ${username}`);
      
      // Reset password and ensure admin has drawing privileges
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      await pool.query(
        'UPDATE users SET password = $1, is_admin = TRUE, can_draw = TRUE WHERE username = $2',
        [hashedPassword, username]
      );
      
      console.log('✅ Admin password reset successfully!');
    }
    
    // Verify the password works
    console.log('\n🔍 Verifying password...');
    const testUser = await User.verifyPassword(username, password);
    
    if (testUser) {
      console.log('✅ Password verification successful!');
      console.log(`\n📋 Login Credentials:`);
      console.log(`   Username: ${username}`);
      console.log(`   Password: ${password}`);
    } else {
      console.error('❌ Password verification failed!');
      process.exit(1);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin password:', error);
    console.error('   Details:', error.message);
    process.exit(1);
  }
};

resetAdminPassword();

