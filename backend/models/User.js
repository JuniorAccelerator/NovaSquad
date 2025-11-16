const { pool } = require('../db/connection');
const bcrypt = require('bcrypt');

class User {
  // Find user by username
  static async findByUsername(username) {
    try {
      const query = 'SELECT * FROM users WHERE username = $1';
      const result = await pool.query(query, [username]);
      return result.rows[0] || null;
    } catch (error) {
      console.error('[User.findByUsername] Database error:', error);
      throw error;
    }
  }

  // Find user by ID
  static async findById(id) {
    const query = 'SELECT id, username, is_admin, can_draw, created_at FROM users WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Check if user is admin
  static async isAdmin(userId) {
    if (!userId) return false;
    const user = await this.findById(userId);
    return user && user.is_admin === true;
  }
  
  // Get all users (admin only)
  static async findAll() {
    const query = 'SELECT id, username, is_admin, can_draw, created_at FROM users ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }
  
  // Update user admin status
  static async updateAdminStatus(userId, isAdmin) {
    const query = 'UPDATE users SET is_admin = $1 WHERE id = $2 RETURNING id, username, is_admin, can_draw, created_at';
    const result = await pool.query(query, [isAdmin, userId]);
    return result.rows[0] || null;
  }
  
  // Update user drawer status
  static async updateDrawerStatus(userId, canDraw) {
    const query = 'UPDATE users SET can_draw = $1 WHERE id = $2 RETURNING id, username, is_admin, can_draw, created_at';
    const result = await pool.query(query, [canDraw, userId]);
    return result.rows[0] || null;
  }

  // Create a new user
  static async create(userData) {
    const { username, password, is_admin = false, can_draw = false } = userData;
    
    // Hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    const query = `
      INSERT INTO users (username, password, is_admin, can_draw)
      VALUES ($1, $2, $3, $4)
      RETURNING id, username, is_admin, can_draw, created_at
    `;
    const result = await pool.query(query, [username, hashedPassword, is_admin, can_draw]);
    return result.rows[0];
  }

  // Verify password
  static async verifyPassword(username, password) {
    try {
      const user = await this.findByUsername(username);
      if (!user) {
        return null;
      }
      
      // Check if user has a password field (might be null if user was created incorrectly)
      if (!user.password) {
        console.error('[User.verifyPassword] User found but password field is missing');
        return null;
      }
      
      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return null;
      }
      
      // Return user without password
      return {
        id: user.id,
        username: user.username,
        is_admin: user.is_admin || false,
        created_at: user.created_at
      };
    } catch (error) {
      console.error('[User.verifyPassword] Error:', error);
      throw error;
    }
  }
}

module.exports = User;

