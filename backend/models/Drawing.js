const { pool } = require('../db/connection');

class Drawing {
  // Get all drawings
  static async findAll() {
    const query = 'SELECT * FROM drawings ORDER BY created_at DESC';
    const result = await pool.query(query);
    return result.rows;
  }

  // Get a single drawing by ID
  static async findById(id) {
    const query = 'SELECT * FROM drawings WHERE id = $1';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Create a new drawing
  static async create(drawingData) {
    const { type, data, title, description, user_id, place_type } = drawingData;
    const query = `
      INSERT INTO drawings (type, data, title, description, user_id, place_type)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await pool.query(query, [type, JSON.stringify(data), title || `Untitled ${type}`, description || '', user_id || null, place_type || null]);
    return result.rows[0];
  }

  // Delete a drawing by ID
  static async deleteById(id) {
    const query = 'DELETE FROM drawings WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Update a drawing
  static async updateById(id, drawingData) {
    const { type, data, title, description, place_type } = drawingData;
    const query = `
      UPDATE drawings 
      SET type = $1, data = $2, title = $3, description = $4, place_type = $5, updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
      RETURNING *
    `;
    const result = await pool.query(query, [type, JSON.stringify(data), title, description, place_type, id]);
    return result.rows[0] || null;
  }
}

module.exports = Drawing;
