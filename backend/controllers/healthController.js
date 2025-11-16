// Health check
const getHealth = async (req, res) => {
  try {
    const { pool } = require('../db/connection');
    // Test database connection
    await pool.query('SELECT 1');
    
    // Check if users table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      );
    `);
    
    const usersTableExists = tableCheck.rows[0].exists;
    
    // Count users if table exists
    let userCount = 0;
    if (usersTableExists) {
      const countResult = await pool.query('SELECT COUNT(*) FROM users');
      userCount = parseInt(countResult.rows[0].count);
    }
    
    res.json({ 
      status: 'OK', 
      message: 'Server is running',
      database: 'connected',
      dbInitialized: req.dbInitialized || false,
      usersTableExists,
      userCount
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: error.message,
      database: 'disconnected',
      dbInitialized: req.dbInitialized || false,
      errorCode: error.code
    });
  }
};

// Test endpoint to check if admin user exists
const testAdmin = async (req, res) => {
  try {
    const User = require('../models/User');
    const adminUser = await User.findByUsername('Admin2');
    if (adminUser) {
      res.json({ 
        exists: true, 
        username: adminUser.username,
        hasPassword: !!adminUser.password,
        id: adminUser.id,
        isAdmin: adminUser.is_admin || false
      });
    } else {
      res.json({ exists: false, message: 'Admin user not found. Run: npm run create-admin' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getHealth,
  testAdmin
};

