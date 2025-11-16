const { pool } = require('../db/connection');

class ForumCategory {
  // Get all categories
  static async findAll() {
    const query = `
      SELECT fc.*, 
        COUNT(DISTINCT ft.id) as thread_count,
        MAX(ft.last_post_at) as last_activity
      FROM forum_categories fc
      LEFT JOIN forum_threads ft ON fc.id = ft.category_id
      GROUP BY fc.id
      ORDER BY fc.order_index, fc.name
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  // Get a single category by ID
  static async findById(id) {
    const query = `
      SELECT fc.*, 
        COUNT(DISTINCT ft.id) as thread_count,
        MAX(ft.last_post_at) as last_activity
      FROM forum_categories fc
      LEFT JOIN forum_threads ft ON fc.id = ft.category_id
      WHERE fc.id = $1
      GROUP BY fc.id
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  // Create a new category
  static async create(categoryData) {
    const { name, description, icon, order_index } = categoryData;
    const query = `
      INSERT INTO forum_categories (name, description, icon, order_index)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [name, description || null, icon || null, order_index || 0]);
    return result.rows[0];
  }

  // Update a category
  static async updateById(id, categoryData) {
    const { name, description, icon, order_index } = categoryData;
    const query = `
      UPDATE forum_categories 
      SET name = COALESCE($1, name),
          description = COALESCE($2, description),
          icon = COALESCE($3, icon),
          order_index = COALESCE($4, order_index)
      WHERE id = $5
      RETURNING *
    `;
    const result = await pool.query(query, [name, description, icon, order_index, id]);
    return result.rows[0] || null;
  }

  // Delete a category
  static async deleteById(id) {
    const query = 'DELETE FROM forum_categories WHERE id = $1 RETURNING *';
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }
}

module.exports = ForumCategory;

