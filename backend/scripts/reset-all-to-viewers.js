require('dotenv').config();
const { pool, initDatabase } = require('../db/connection');

const resetAllToViewers = async () => {
  try {
    console.log('🔧 Resetting all non-admin users to viewers...');
    
    // Initialize database schema first
    await initDatabase();
    
    // Reset ALL non-admin users to viewers (can_draw = FALSE)
    const result = await pool.query(`
      UPDATE users 
      SET can_draw = FALSE
      WHERE is_admin = FALSE;
    `);
    
    console.log(`✅ Reset ${result.rowCount} non-admin users to viewers`);
    
    // Set NULL values to FALSE
    const nullResult = await pool.query(`
      UPDATE users 
      SET can_draw = FALSE
      WHERE can_draw IS NULL;
    `);
    
    if (nullResult.rowCount > 0) {
      console.log(`✅ Set ${nullResult.rowCount} NULL values to FALSE`);
    }
    
    // Ensure admins have drawing privileges
    const adminResult = await pool.query(`
      UPDATE users 
      SET can_draw = TRUE
      WHERE is_admin = TRUE;
    `);
    
    console.log(`✅ Ensured ${adminResult.rowCount} admin(s) have drawing privileges`);
    
    // Show summary
    const summary = await pool.query(`
      SELECT 
        COUNT(*) FILTER (WHERE can_draw = TRUE) as drawers,
        COUNT(*) FILTER (WHERE can_draw = FALSE) as viewers,
        COUNT(*) FILTER (WHERE can_draw IS NULL) as nulls
      FROM users;
    `);
    
    const stats = summary.rows[0];
    console.log('\n📊 Current Status:');
    console.log(`   Drawers: ${stats.drawers}`);
    console.log(`   Viewers: ${stats.viewers}`);
    if (parseInt(stats.nulls) > 0) {
      console.log(`   NULL values: ${stats.nulls}`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting users:', error);
    console.error('   Details:', error.message);
    process.exit(1);
  }
};

resetAllToViewers();

