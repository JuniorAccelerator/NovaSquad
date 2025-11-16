require('dotenv').config();
const { pool, initDatabase } = require('../db/connection');
const User = require('../models/User');
const bcrypt = require('bcrypt');

const clearAllData = async () => {
  try {
    console.log('🗑️  Starting to clear all database data...');
    
    // Initialize database schema first
    await initDatabase();
    
    const adminUsername = 'admin2';
    const adminPassword = 'admin123';
    
    // Step 1: Delete all data from tables (in order to respect foreign key constraints)
    console.log('\n📊 Clearing data from tables...');
    
    // Delete comments (references drawings and threads)
    const commentsResult = await pool.query('DELETE FROM comments');
    console.log(`   ✓ Deleted ${commentsResult.rowCount} comment(s)`);
    
    // Delete votes (references drawings and users)
    const votesResult = await pool.query('DELETE FROM votes');
    console.log(`   ✓ Deleted ${votesResult.rowCount} vote(s)`);
    
    // Delete drawings (references users)
    const drawingsResult = await pool.query('DELETE FROM drawings');
    console.log(`   ✓ Deleted ${drawingsResult.rowCount} drawing(s)`);
    
    // Delete forum threads (references categories and users)
    const threadsResult = await pool.query('DELETE FROM forum_threads');
    console.log(`   ✓ Deleted ${threadsResult.rowCount} forum thread(s)`);
    
    // Delete forum categories (will be recreated by initDatabase)
    const categoriesResult = await pool.query('DELETE FROM forum_categories');
    console.log(`   ✓ Deleted ${categoriesResult.rowCount} forum categor(ies)`);
    
    // Step 2: Handle admin user
    console.log('\n👤 Managing admin user...');
    
    // Check if admin2 exists
    const existingAdmin = await User.findByUsername(adminUsername);
    
    if (existingAdmin) {
      // Update existing admin user to ensure correct password and permissions
      console.log(`   → Updating existing admin user: ${adminUsername}`);
      
      // Hash the new password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
      
      // Update user with correct password and admin status
      await pool.query(
        'UPDATE users SET password = $1, is_admin = TRUE, can_draw = TRUE WHERE username = $2',
        [hashedPassword, adminUsername]
      );
      
      console.log(`   ✓ Updated admin user: ${adminUsername}`);
    } else {
      // Create new admin user
      console.log(`   → Creating new admin user: ${adminUsername}`);
      await User.create({
        username: adminUsername,
        password: adminPassword,
        is_admin: true,
        can_draw: true
      });
      console.log(`   ✓ Created admin user: ${adminUsername}`);
    }
    
    // Step 3: Delete all other users
    console.log('\n🗑️  Removing all other users...');
    const deleteUsersResult = await pool.query(
      'DELETE FROM users WHERE username != $1',
      [adminUsername]
    );
    console.log(`   ✓ Deleted ${deleteUsersResult.rowCount} other user(s)`);
    
    // Step 4: Reinitialize database to restore default forum categories
    console.log('\n🔄 Reinitializing database schema (restoring default categories)...');
    await initDatabase();
    
    // Step 5: Verify admin user still exists and is correct
    const finalAdmin = await User.findByUsername(adminUsername);
    if (!finalAdmin) {
      throw new Error('Admin user was not found after cleanup!');
    }
    
    // Verify password works
    const passwordValid = await User.verifyPassword(adminUsername, adminPassword);
    if (!passwordValid) {
      throw new Error('Admin password verification failed!');
    }
    
    console.log('\n✅ Database cleanup completed successfully!');
    console.log('\n📋 Admin Account:');
    console.log(`   Username: ${adminUsername}`);
    console.log(`   Password: ${adminPassword}`);
    console.log(`   Admin: ${finalAdmin.is_admin ? 'Yes' : 'No'}`);
    console.log(`   Can Draw: ${finalAdmin.can_draw ? 'Yes' : 'No'}`);
    
    // Get final counts
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const drawingCount = await pool.query('SELECT COUNT(*) FROM drawings');
    const commentCount = await pool.query('SELECT COUNT(*) FROM comments');
    const voteCount = await pool.query('SELECT COUNT(*) FROM votes');
    const threadCount = await pool.query('SELECT COUNT(*) FROM forum_threads');
    const categoryCount = await pool.query('SELECT COUNT(*) FROM forum_categories');
    
    console.log('\n📊 Final Database State:');
    console.log(`   Users: ${userCount.rows[0].count}`);
    console.log(`   Drawings: ${drawingCount.rows[0].count}`);
    console.log(`   Comments: ${commentCount.rows[0].count}`);
    console.log(`   Votes: ${voteCount.rows[0].count}`);
    console.log(`   Forum Threads: ${threadCount.rows[0].count}`);
    console.log(`   Forum Categories: ${categoryCount.rows[0].count}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    console.error('   Error details:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  clearAllData();
}

module.exports = { clearAllData };

