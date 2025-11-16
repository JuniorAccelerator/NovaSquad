const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'hackathon_drawings',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // Maximum number of clients in the pool
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test the connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected error on idle client', err);
  process.exit(-1);
});

// Initialize database schema
const initDatabase = async () => {
  try {
    // Test connection first
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add is_admin column if it doesn't exist (migration for existing tables)
    const isAdminCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='is_admin';
    `);
    
    if (isAdminCheck.rows.length === 0) {
      console.log('   → Adding is_admin column to users table...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN is_admin BOOLEAN DEFAULT FALSE;
      `);
      console.log('   ✓ is_admin column added to users');
    }
    
    // Add can_draw column if it doesn't exist (migration for existing tables)
    const canDrawCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='users' AND column_name='can_draw';
    `);
    
    if (canDrawCheck.rows.length === 0) {
      console.log('   → Adding can_draw column to users table...');
      await pool.query(`
        ALTER TABLE users 
        ADD COLUMN can_draw BOOLEAN DEFAULT FALSE;
      `);
      console.log('   ✓ can_draw column added to users (default: viewer)');
    } else {
      // Reset ALL non-admin users to viewers (can_draw = FALSE)
      // Only admins should have drawing privileges
      await pool.query(`
        UPDATE users 
        SET can_draw = FALSE
        WHERE is_admin = FALSE;
      `);
      
      // Set NULL values to FALSE (viewer)
      await pool.query(`
        UPDATE users 
        SET can_draw = FALSE
        WHERE can_draw IS NULL;
      `);
      
      // Ensure admins have drawing privileges
      await pool.query(`
        UPDATE users 
        SET can_draw = TRUE
        WHERE is_admin = TRUE AND can_draw = FALSE;
      `);
      
      // Ensure default constraint is FALSE for new users
      await pool.query(`
        ALTER TABLE users 
        ALTER COLUMN can_draw SET DEFAULT FALSE;
      `);
      console.log('   ✓ Reset all non-admin users to viewers (can_draw = FALSE)');
    }
    
    // Create drawings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS drawings (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL CHECK (type IN ('marker', 'circle', 'polygon', 'polyline', 'rectangle')),
        data JSONB NOT NULL,
        title VARCHAR(255) NOT NULL DEFAULT 'Untitled Drawing',
        description TEXT DEFAULT '',
        place_type VARCHAR(50) CHECK (place_type IN ('building', 'landmarks', 'parks', 'infrastructures')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add place_type column if it doesn't exist (migration for existing tables)
    const placeTypeCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='drawings' AND column_name='place_type';
    `);
    
    if (placeTypeCheck.rows.length === 0) {
      console.log('   → Adding place_type column to drawings table...');
      await pool.query(`
        ALTER TABLE drawings 
        ADD COLUMN place_type VARCHAR(50) CHECK (place_type IN ('building', 'landmarks', 'parks', 'infrastructures'));
      `);
      console.log('   ✓ place_type column added to drawings');
    }
    
    // Create comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        drawing_id INTEGER REFERENCES drawings(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create votes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        drawing_id INTEGER REFERENCES drawings(id) ON DELETE CASCADE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE NOT NULL,
        vote_type VARCHAR(10) NOT NULL CHECK (vote_type IN ('upvote', 'downvote')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(drawing_id, user_id)
      );
    `);
    
    // Add vote_type column if it doesn't exist (migration for existing tables)
    const voteTypeCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='votes' AND column_name='vote_type';
    `);
    
    if (voteTypeCheck.rows.length === 0) {
      console.log('   → Adding vote_type column to votes table...');
      await pool.query(`
        ALTER TABLE votes 
        ADD COLUMN vote_type VARCHAR(10) NOT NULL DEFAULT 'upvote' CHECK (vote_type IN ('upvote', 'downvote'));
      `);
      console.log('   ✓ vote_type column added to votes');
    }
    
    // Add drawing_id column to comments if it doesn't exist (migration for existing tables)
    const commentDrawingIdCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='comments' AND column_name='drawing_id';
    `);
    
    if (commentDrawingIdCheck.rows.length === 0) {
      console.log('   → Adding drawing_id column to comments table...');
      await pool.query(`
        ALTER TABLE comments 
        ADD COLUMN drawing_id INTEGER REFERENCES drawings(id) ON DELETE CASCADE;
      `);
      console.log('   ✓ drawing_id column added to comments');
    }
    
    // Add user_id column if it doesn't exist (migration for existing tables)
    const columnCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='drawings' AND column_name='user_id';
    `);
    
    if (columnCheck.rows.length === 0) {
      console.log('   → Adding user_id column to drawings table...');
      await pool.query(`
        ALTER TABLE drawings 
        ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
      `);
      console.log('   ✓ user_id column added');
    }
    
    // Create indexes
    await pool.query('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_drawings_type ON drawings(type);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_drawings_created_at ON drawings(created_at DESC);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comments_drawing_id ON comments(drawing_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_votes_drawing_id ON votes(drawing_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_votes_user_id ON votes(user_id);');
    
    // Create user_id index only if the column exists
    const userIdIndexCheck = await pool.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename='drawings' AND indexname='idx_drawings_user_id';
    `);
    
    if (userIdIndexCheck.rows.length === 0) {
      await pool.query('CREATE INDEX IF NOT EXISTS idx_drawings_user_id ON drawings(user_id);');
    }
    
    // Create forum_categories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_categories (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        icon VARCHAR(50),
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Create forum_threads table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS forum_threads (
        id SERIAL PRIMARY KEY,
        category_id INTEGER REFERENCES forum_categories(id) ON DELETE CASCADE NOT NULL,
        title VARCHAR(255) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_post_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    // Add thread_id column to comments if it doesn't exist
    const threadIdCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='comments' AND column_name='thread_id';
    `);
    
    if (threadIdCheck.rows.length === 0) {
      console.log('   → Adding thread_id column to comments table...');
      await pool.query(`
        ALTER TABLE comments 
        ADD COLUMN thread_id INTEGER REFERENCES forum_threads(id) ON DELETE CASCADE;
      `);
      console.log('   ✓ thread_id column added to comments');
    }
    
    // Create indexes for forum tables
    await pool.query('CREATE INDEX IF NOT EXISTS idx_forum_categories_order ON forum_categories(order_index);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_forum_threads_category_id ON forum_threads(category_id);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_forum_threads_last_post_at ON forum_threads(last_post_at DESC);');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_comments_thread_id ON comments(thread_id);');
    
    // Ensure all place types have corresponding forum categories
    console.log('   → Ensuring forum categories match all place types...');
    
    // Define all place types with their details (capitalized names)
    const placeTypes = [
      { name: 'Building', description: 'Discuss buildings and architectural structures', icon: '🏢', order: 1 },
      { name: 'Landmarks', description: 'Share and discuss notable landmarks', icon: '🗼', order: 2 },
      { name: 'Parks', description: 'Talk about parks and recreational areas', icon: '🌳', order: 3 },
      { name: 'Infrastructures', description: 'Discuss infrastructure and public facilities', icon: '🏗️', order: 4 }
    ];
    
    // Update existing categories that might match place types (various name variations)
    const categoryMappings = [
      // Building variations
      { oldNames: ['announcements', 'announcement', 'buildings', 'building'], newName: 'Building' },
      // Landmarks variations
      { oldNames: ['landmark', 'landmarks'], newName: 'Landmarks' },
      // Parks variations
      { oldNames: ['park', 'parks'], newName: 'Parks' },
      // Infrastructures variations
      { oldNames: ['infrastructure', 'infrastructures'], newName: 'Infrastructures' }
    ];
    
    for (const mapping of categoryMappings) {
      const placeType = placeTypes.find(pt => pt.name === mapping.newName);
      if (placeType) {
        // Update each old name variation individually (skip if it's already the target name)
        for (const oldName of mapping.oldNames) {
          if (oldName.toLowerCase() !== placeType.name.toLowerCase()) {
            await pool.query(`
              UPDATE forum_categories 
              SET name = $1, description = $2, icon = $3, order_index = $4
              WHERE LOWER(name) = LOWER($5)
            `, [placeType.name, placeType.description, placeType.icon, placeType.order, oldName]);
          }
        }
      }
    }
    
    // Ensure all place types have categories (create if missing)
    for (const placeType of placeTypes) {
      const existing = await pool.query(
        'SELECT id, name FROM forum_categories WHERE LOWER(name) = LOWER($1)',
        [placeType.name]
      );
      
      if (existing.rows.length === 0) {
        await pool.query(`
          INSERT INTO forum_categories (name, description, icon, order_index) 
          VALUES ($1, $2, $3, $4)
        `, [placeType.name, placeType.description, placeType.icon, placeType.order]);
        console.log(`   ✓ Created category: ${placeType.name}`);
      } else {
        // Update existing to ensure correct details and capitalized name
        await pool.query(`
          UPDATE forum_categories 
          SET name = $1, description = $2, icon = $3, order_index = $4
          WHERE LOWER(name) = LOWER($5)
        `, [placeType.name, placeType.description, placeType.icon, placeType.order, placeType.name]);
      }
    }
    
    console.log('   ✓ All forum categories match place types');
    
    // Add General Discussion category (at the top, order_index = 0)
    const generalDiscussionCheck = await pool.query(
      'SELECT id FROM forum_categories WHERE LOWER(name) = LOWER($1)',
      ['General Discussion']
    );
    
    if (generalDiscussionCheck.rows.length === 0) {
      await pool.query(`
        INSERT INTO forum_categories (name, description, icon, order_index) 
        VALUES ($1, $2, $3, $4)
      `, ['General Discussion', 'General discussions and community chat', '💬', 0]);
      console.log('   ✓ Created category: General Discussion');
    } else {
      // Update existing to ensure correct details and place at top
      await pool.query(`
        UPDATE forum_categories 
        SET name = $1, description = $2, icon = $3, order_index = $4
        WHERE LOWER(name) = LOWER($5)
      `, ['General Discussion', 'General discussions and community chat', '💬', 0, 'General Discussion']);
    }
    
    // Remove unwanted categories (case-insensitive matching)
    const categoriesToRemove = ['Help & Support', 'Help and Support', 'Feedback'];
    const removedCategories = [];
    for (const categoryName of categoriesToRemove) {
      const result = await pool.query(
        'DELETE FROM forum_categories WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) RETURNING name',
        [categoryName]
      );
      if (result.rows.length > 0) {
        removedCategories.push(result.rows[0].name);
      }
    }
    if (removedCategories.length > 0) {
      console.log(`   ✓ Removed ${removedCategories.length} unwanted category/categories: ${removedCategories.join(', ')}`);
    }
    
    // Remove duplicate categories (case-insensitive matching)
    console.log('   → Checking for duplicate categories...');
    const allCategories = await pool.query(`
      SELECT id, name, LOWER(name) as lower_name
      FROM forum_categories
      ORDER BY id
    `);
    
    const nameGroups = {};
    for (const cat of allCategories.rows) {
      const lowerName = cat.lower_name;
      if (!nameGroups[lowerName]) {
        nameGroups[lowerName] = [];
      }
      nameGroups[lowerName].push(cat);
    }
    
    const duplicatesRemoved = [];
    for (const [lowerName, categories] of Object.entries(nameGroups)) {
      if (categories.length > 1) {
        // Sort by ID to keep the first one (lowest ID)
        categories.sort((a, b) => a.id - b.id);
        const keepCategory = categories[0];
        const duplicates = categories.slice(1);
        
        // Move threads from duplicates to the kept category
        for (const duplicate of duplicates) {
          await pool.query(`
            UPDATE forum_threads 
            SET category_id = $1 
            WHERE category_id = $2
          `, [keepCategory.id, duplicate.id]);
          
          // Delete the duplicate category
          await pool.query('DELETE FROM forum_categories WHERE id = $1', [duplicate.id]);
          duplicatesRemoved.push(`${duplicate.name} (merged into ${keepCategory.name})`);
        }
      }
    }
    
    if (duplicatesRemoved.length > 0) {
      console.log(`   ✓ Removed ${duplicatesRemoved.length} duplicate category/categories`);
    }
    
    console.log('✅ Database schema initialized');
  } catch (error) {
    console.error('❌ Error initializing database schema:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   → PostgreSQL server is not running or not accessible');
      console.error('   → Please start PostgreSQL and ensure it\'s running on port', process.env.DB_PORT || 5432);
    } else if (error.code === '3D000') {
      console.error('   → Database does not exist');
      console.error('   → Please create the database:', process.env.DB_NAME || 'hackathon_drawings');
      console.error('   → Run: CREATE DATABASE hackathon_drawings;');
    } else if (error.code === '28P01') {
      console.error('   → Authentication failed');
      console.error('   → Please check your database credentials in .env file');
    }
    throw error; // Re-throw to allow server.js to handle it
  }
};

module.exports = { pool, initDatabase };

