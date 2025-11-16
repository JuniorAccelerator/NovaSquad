const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

// Register new user
const register = async (req, res) => {
  try {
    console.log('[REGISTER] Registration request received');
    
    const { username, password } = req.body;
    console.log('[REGISTER] Attempting to register user:', username);

    if (!username || !password) {
      console.error('[REGISTER] Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.length < 3) {
      console.error('[REGISTER] Username too short');
      return res.status(400).json({ error: 'Username must be at least 3 characters long' });
    }

    if (password.length < 6) {
      console.error('[REGISTER] Password too short');
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    console.log('[REGISTER] Checking if user exists...');
    const existingUser = await User.findByUsername(username);
    if (existingUser) {
      console.error('[REGISTER] Username already exists:', username);
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Create new user
    console.log('[REGISTER] Creating new user...');
    const user = await User.create({ username, password });
    console.log('[REGISTER] User created successfully:', user.id);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Check if user is admin (should be false for new registrations)
    const isUserAdmin = await User.isAdmin(user.id);
    // New users default to viewer (can_draw = false)
    const canDraw = user.can_draw === true;

    console.log('[REGISTER] Registration successful for user:', username);
    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: isUserAdmin,
        canDraw: canDraw
      }
    });
  } catch (error) {
    console.error('[REGISTER] Error registering user:', error);
    console.error('[REGISTER] Error stack:', error.stack);
    console.error('[REGISTER] Error code:', error.code);
    console.error('[REGISTER] Error details:', error.message);
    res.status(500).json({ error: 'Failed to register user', details: error.message });
  }
};

// Login user
const login = async (req, res) => {
  try {
    console.log('[LOGIN] Login request received');
    
    const { username, password } = req.body;

    if (!username || !password) {
      console.error('[LOGIN] Missing username or password');
      return res.status(400).json({ error: 'Username and password are required' });
    }

    console.log(`[LOGIN] Attempting login for user: ${username}`);

    // Verify credentials
    let user;
    try {
      user = await User.verifyPassword(username, password);
    } catch (dbError) {
      console.error('[LOGIN] Database error during password verification:', dbError);
      console.error('[LOGIN] Error code:', dbError.code);
      console.error('[LOGIN] Error message:', dbError.message);
      return res.status(500).json({ 
        error: 'Database error during login', 
        details: dbError.message,
        code: dbError.code
      });
    }

    if (!user) {
      console.log(`[LOGIN] Invalid credentials for user: ${username}`);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    console.log(`[LOGIN] Successful login for user: ${username} (ID: ${user.id})`);

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Check if user is admin and get drawing privileges
    const isUserAdmin = await User.isAdmin(user.id);
    const userData = await User.findById(user.id);
    const canDraw = userData ? userData.can_draw === true : false;
    console.log(`[LOGIN] User ${username} is admin: ${isUserAdmin}, can draw: ${canDraw}`);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        username: user.username,
        isAdmin: isUserAdmin,
        canDraw: canDraw
      }
    });
  } catch (error) {
    console.error('[LOGIN] Unexpected error:', error);
    console.error('[LOGIN] Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to login', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// Verify token (get current user)
const getMe = async (req, res) => {
  try {
    const userData = await User.findById(req.user.id);
    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const isUserAdmin = await User.isAdmin(req.user.id);
    res.json({
      success: true,
      user: {
        id: req.user.id,
        username: req.user.username,
        isAdmin: isUserAdmin,
        canDraw: userData.can_draw === true
      }
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
};

module.exports = {
  register,
  login,
  getMe
};

