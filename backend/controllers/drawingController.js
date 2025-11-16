const Drawing = require('../models/Drawing');
const User = require('../models/User');
const Vote = require('../models/Vote');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// Get all drawings with vote counts and user vote status
const getAllDrawings = async (req, res) => {
  try {
    const drawings = await Drawing.findAll();
    
    // Get user_id from token if authenticated
    let userId = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      }
    } catch (err) {
      // Token invalid or missing - continue without user_id
      userId = null;
    }
    
    // Parse JSONB data field for each drawing
    const parsedDrawings = drawings.map(drawing => ({
      ...drawing,
      data: typeof drawing.data === 'string' ? JSON.parse(drawing.data) : drawing.data
    }));
    
    // Get vote counts for all drawings
    const drawingIds = parsedDrawings.map(d => d.id);
    const voteCounts = await Vote.getVoteCountsForDrawings(drawingIds);
    const userVotes = userId ? await Vote.getUserVotesForDrawings(drawingIds, userId) : {};
    
    // Check if user is admin
    let isUserAdmin = false;
    if (userId) {
      isUserAdmin = await User.isAdmin(userId);
    }
    
    // Add vote information to each drawing
    const drawingsWithVotes = parsedDrawings.map(drawing => {
      const counts = voteCounts[drawing.id] || { upvotes: 0, downvotes: 0 };
      const userVote = userVotes[drawing.id] || null;
      
      return {
        ...drawing,
        upvotes: counts.upvotes,
        downvotes: counts.downvotes,
        userVote: userVote // 'upvote', 'downvote', or null
      };
    });
    
    res.json(drawingsWithVotes);
  } catch (error) {
    console.error('Error fetching drawings:', error);
    res.status(500).json({ error: 'Failed to fetch drawings', details: error.message });
  }
};

// Get a single drawing by ID
const getDrawingById = async (req, res) => {
  try {
    const drawing = await Drawing.findById(req.params.id);
    if (!drawing) {
      return res.status(404).json({ error: 'Drawing not found' });
    }
    // Parse JSONB data field
    const parsedDrawing = {
      ...drawing,
      data: typeof drawing.data === 'string' ? JSON.parse(drawing.data) : drawing.data
    };
    res.json(parsedDrawing);
  } catch (error) {
    console.error('Error fetching drawing:', error);
    res.status(500).json({ error: 'Failed to fetch drawing' });
  }
};

// Save a new drawing (requires authentication and drawing privileges)
const createDrawing = async (req, res) => {
  try {
    // Check if user has drawing privileges
    const user = await User.findById(req.user.id);
    if (!user || user.can_draw !== true) {
      return res.status(403).json({ 
        error: 'Drawing privileges required', 
        message: 'You do not have permission to create drawings. Please contact an admin to grant drawing privileges.' 
      });
    }
    
    const drawingData = {
      type: req.body.type,
      data: req.body.data,
      title: req.body.title || `Untitled ${req.body.type}`,
      description: req.body.description || '',
      place_type: req.body.place_type || null,
      user_id: req.user.id
    };
    
    const savedDrawing = await Drawing.create(drawingData);
    // Parse JSONB data field
    const parsedDrawing = {
      ...savedDrawing,
      data: typeof savedDrawing.data === 'string' ? JSON.parse(savedDrawing.data) : savedDrawing.data
    };
    res.json({ success: true, drawing: parsedDrawing });
  } catch (error) {
    console.error('Error saving drawing:', error);
    res.status(500).json({ error: 'Failed to save drawing', details: error.message });
  }
};

// Delete a drawing by ID (requires authentication)
const deleteDrawing = async (req, res) => {
  try {
    const drawing = await Drawing.deleteById(req.params.id);
    if (!drawing) {
      return res.status(404).json({ error: 'Drawing not found' });
    }
    res.json({ success: true, message: 'Drawing deleted successfully' });
  } catch (error) {
    console.error('Error deleting drawing:', error);
    res.status(500).json({ error: 'Failed to delete drawing' });
  }
};

module.exports = {
  getAllDrawings,
  getDrawingById,
  createDrawing,
  deleteDrawing
};

