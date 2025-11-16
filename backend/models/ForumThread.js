const { pool } = require('../db/connection');

class ForumThread {
  // Get all threads for a category
  static async findByCategoryId(categoryId) {
    const query = `
      SELECT ft.*, 
        u.username,
        COUNT(DISTINCT c.id) as post_count,
        MAX(c.created_at) as last_post_at
      FROM forum_threads ft
      LEFT JOIN users u ON ft.user_id = u.id
      LEFT JOIN comments c ON ft.id = c.thread_id
      WHERE ft.category_id = $1
      GROUP BY ft.id, u.username
      ORDER BY ft.last_post_at DESC, ft.created_at DESC
    `;
    const result = await pool.query(query, [categoryId]);
    return result.rows;
  }

  // Get a single thread by ID with category info
  static async findById(id) {
    const query = `
      SELECT ft.*, 
        u.username,
        fc.name as category_name,
        fc.id as category_id,
        COUNT(DISTINCT c.id) as post_count
      FROM forum_threads ft
      LEFT JOIN users u ON ft.user_id = u.id
      LEFT JOIN forum_categories fc ON ft.category_id = fc.id
      LEFT JOIN comments c ON ft.id = c.thread_id
      WHERE ft.id = $1
      GROUP BY ft.id, u.username, fc.name, fc.id
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Search threads by title or content
  static async search(searchTerm, categoryId = null) {
    let query = `
      SELECT DISTINCT ft.*, 
        u.username,
        fc.name as category_name,
        fc.id as category_id,
        COUNT(DISTINCT c.id) as post_count,
        MAX(c.created_at) as last_post_at
      FROM forum_threads ft
      LEFT JOIN users u ON ft.user_id = u.id
      LEFT JOIN forum_categories fc ON ft.category_id = fc.id
      LEFT JOIN comments c ON ft.id = c.thread_id
      WHERE (ft.title ILIKE $1 OR c.content ILIKE $1)
    `;
    const params = [`%${searchTerm}%`];
    
    if (categoryId) {
      query += ` AND ft.category_id = $2`;
      params.push(categoryId);
    }
    
    query += `
      GROUP BY ft.id, u.username, fc.name, fc.id
      ORDER BY ft.last_post_at DESC, ft.created_at DESC
    `;
    
    const result = await pool.query(query, params);
    return result.rows;
  }

  // Create a new thread
  static async create(threadData) {
    const { category_id, title, user_id } = threadData;
    const query = `
      INSERT INTO forum_threads (category_id, title, user_id)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await pool.query(query, [category_id, title, user_id || null]);
    return result.rows[0];
  }

  // Update thread's last_post_at
  static async updateLastPostAt(threadId) {
    const query = `
      UPDATE forum_threads 
      SET last_post_at = CURRENT_TIMESTAMP,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await pool.query(query, [threadId]);
    return result.rows[0] || null;
  }

  // Delete a thread
  static async deleteById(id) {
    const query = 'DELETE FROM forum_threads WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = ForumThread;

