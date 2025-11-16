const { pool } = require('../db/connection');

class Comment {
  // Get all comments
  static async findAll() {
    const query = `
      SELECT c.*, u.username, d.title as drawing_title, d.id as drawing_id
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN drawings d ON c.drawing_id = d.id
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Get comments for a specific drawing
  static async findByDrawingId(drawingId) {
    const query = `
      SELECT c.*, u.username 
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.drawing_id = $1
      ORDER BY c.created_at DESC
    `;
    const result = await pool.query(query, [drawingId]);
    return result.rows;
  }

  // Get comments for a specific thread
  static async findByThreadId(threadId) {
    const query = `
      SELECT c.*, u.username 
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.thread_id = $1
      ORDER BY c.created_at ASC
    `;
    const result = await pool.query(query, [threadId]);
    return result.rows;
  }

  // Get a single comment by ID
  static async findById(id) {
    const query = `
      SELECT c.*, u.username 
      FROM comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = $1
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Create a new comment
  static async create(commentData) {
    const { content, user_id, drawing_id, thread_id } = commentData;
    const query = `
      INSERT INTO comments (content, user_id, drawing_id, thread_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [content, user_id || null, drawing_id || null, thread_id || null]);
    
    // Fetch with username
    const comment = await this.findById(result.rows[0].id);
    
    // Update thread's last_post_at if this is a thread comment
    if (thread_id) {
      const ForumThread = require('./ForumThread');
      await ForumThread.updateLastPostAt(thread_id);
    }
    
    return comment;
  }

  // Delete a comment by ID
  static async deleteById(id) {
    const query = 'DELETE FROM comments WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Update a comment
  static async updateById(id, commentData) {
    const { content } = commentData;
    const query = `
      UPDATE comments 
      SET content = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [content, id]);
    return result.rows[0] || null;
  }
}

module.exports = Comment;

