require('dotenv').config();
const { pool, initDatabase } = require('../db/connection');
const Drawing = require('../models/Drawing');

const clearAllDrawings = async () => {
  try {
    console.log('🗑️  Starting to clear all drawings...');
    
    // Initialize database schema first
    await initDatabase();
    
    // Get count of existing drawings
    const existingDrawings = await Drawing.findAll();
    const count = existingDrawings.length;
    
    if (count === 0) {
      console.log('   ℹ️  No drawings found in database. Nothing to clear.');
      process.exit(0);
    }
    
    console.log(`   Found ${count} drawing(s) to delete...`);
    
    // Delete all drawings
    // Note: Due to CASCADE constraints, this will also delete associated comments and votes
    await pool.query('DELETE FROM drawings');
    
    console.log(`✅ Successfully cleared ${count} drawing(s) from the database.`);
    console.log('   (Associated comments and votes were also deleted due to CASCADE constraints)');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error clearing drawings:', error);
    console.error('   Error details:', error.message);
    process.exit(1);
  }
};

// Run if this file is executed directly
if (require.main === module) {
  clearAllDrawings();
}

module.exports = { clearAllDrawings };

