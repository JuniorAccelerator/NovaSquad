require('dotenv').config();
const { pool, initDatabase } = require('../db/connection');
const Drawing = require('../models/Drawing');
const User = require('../models/User');
const bcrypt = require('bcrypt');

// Default sample drawings data
const defaultDrawings = [
  // Marker examples
  {
    type: 'marker',
    data: {
      position: { lat: 42.1934, lng: 24.3336 }
    },
    title: 'Pazardzik City Center',
    description: 'Main city center marker in Pazardzik, Bulgaria'
  },
  {
    type: 'marker',
    data: {
      position: { lat: 42.2000, lng: 24.3400 }
    },
    title: 'Landmark Point',
    description: 'An important landmark location'
  },
  
  // Circle examples
  {
    type: 'circle',
    data: {
      center: { lat: 42.1934, lng: 24.3336 },
      radius: 1000 // meters
    },
    title: 'City Center Area',
    description: '1km radius circle around the city center'
  },
  {
    type: 'circle',
    data: {
      center: { lat: 42.2100, lng: 24.3200 },
      radius: 500
    },
    title: 'Small Area Zone',
    description: '500m radius zone for special events'
  },
  
  // Polygon examples
  {
    type: 'polygon',
    data: {
      paths: [
        { lat: 42.1900, lng: 24.3300 },
        { lat: 42.1950, lng: 24.3350 },
        { lat: 42.2000, lng: 24.3300 },
        { lat: 42.1950, lng: 24.3250 },
        { lat: 42.1900, lng: 24.3300 }
      ]
    },
    title: 'Park Boundary',
    description: 'City park area boundaries'
  },
  {
    type: 'polygon',
    data: {
      paths: [
        { lat: 42.1800, lng: 24.3200 },
        { lat: 42.1850, lng: 24.3250 },
        { lat: 42.1900, lng: 24.3200 },
        { lat: 42.1850, lng: 24.3150 },
        { lat: 42.1800, lng: 24.3200 }
      ]
    },
    title: 'Residential Zone',
    description: 'Residential area polygon'
  },
  
  // Polyline examples
  {
    type: 'polyline',
    data: {
      path: [
        { lat: 42.1934, lng: 24.3336 },
        { lat: 42.2000, lng: 24.3400 },
        { lat: 42.2100, lng: 24.3500 }
      ]
    },
    title: 'Main Route',
    description: 'Primary transportation route through the city'
  },
  {
    type: 'polyline',
    data: {
      path: [
        { lat: 42.1900, lng: 24.3300 },
        { lat: 42.1950, lng: 24.3350 },
        { lat: 42.2000, lng: 24.3400 }
      ]
    },
    title: 'Walking Path',
    description: 'Pedestrian walking path'
  },
  
  // Rectangle examples
  {
    type: 'rectangle',
    data: {
      bounds: {
        north: 42.2000,
        south: 42.1900,
        east: 24.3400,
        west: 24.3300
      }
    },
    title: 'City Square',
    description: 'Main city square area'
  },
  {
    type: 'rectangle',
    data: {
      bounds: {
        north: 42.2100,
        south: 42.2000,
        east: 24.3500,
        west: 24.3400
      }
    },
    title: 'Commercial District',
    description: 'Commercial and business district boundaries'
  }
];

const seedDatabase = async (force = false) => {
  try {
    console.log('🌱 Starting database seeding...');
    
    // Initialize database schema first
    await initDatabase();
    
    // Remove all existing admin users except Admin2
    console.log('👤 Cleaning up admin users...');
    await pool.query(`
      UPDATE users 
      SET is_admin = FALSE 
      WHERE username != 'Admin2' AND is_admin = TRUE
    `);
    
    // Create or update the single admin user
    const defaultUsername = 'Admin2';
    const defaultPassword = 'admin123';
    
    console.log('👤 Checking for admin user...');
    let defaultUser = await User.findByUsername(defaultUsername);
    
    if (!defaultUser) {
      console.log(`   Creating admin user: ${defaultUsername}`);
      defaultUser = await User.create({
        username: defaultUsername,
        password: defaultPassword,
        is_admin: true,
        can_draw: true  // Admins get drawing privileges by default
      });
      console.log(`   ✓ Admin user created: ${defaultUsername} / ${defaultPassword}`);
    } else {
      // Update existing user to ensure it's admin, has drawing privileges, and reset password
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(defaultPassword, saltRounds);
      
      await pool.query(
        'UPDATE users SET is_admin = TRUE, can_draw = TRUE, password = $1 WHERE username = $2',
        [hashedPassword, defaultUsername]
      );
      console.log(`   ✓ Admin user updated: ${defaultUsername} / ${defaultPassword}`);
    }
    
    // Check if drawings already exist
    const existingDrawings = await Drawing.findAll();
    if (existingDrawings.length > 0 && !force) {
      console.log(`⚠️  Database already contains ${existingDrawings.length} drawings.`);
      console.log('   To reseed, run: npm run seed -- --force');
      process.exit(0);
    }
    
    // Clear existing drawings if force flag is set
    if (force && existingDrawings.length > 0) {
      console.log(`🗑️  Clearing ${existingDrawings.length} existing drawings...`);
      await pool.query('DELETE FROM drawings');
      console.log('   ✓ All existing drawings cleared');
    }
    
    // Insert default drawings
    console.log(`📝 Inserting ${defaultDrawings.length} default drawings...`);
    
    for (const drawingData of defaultDrawings) {
      await Drawing.create(drawingData);
      console.log(`   ✓ Created: ${drawingData.title}`);
    }
    
    console.log('✅ Database seeding completed successfully!');
    console.log(`   Total drawings in database: ${defaultDrawings.length}`);
    console.log(`\n📋 Default Account Credentials:`);
    console.log(`   Username: ${defaultUsername}`);
    console.log(`   Password: ${defaultPassword}`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seed if this file is executed directly
if (require.main === module) {
  const force = process.argv.includes('--force');
  seedDatabase(force);
}

module.exports = { seedDatabase, defaultDrawings };

