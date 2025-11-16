const Comment = require('../models/Comment');
const Drawing = require('../models/Drawing');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// Get all comments
const getAllComments = async (req, res) => {
  try {
    const comments = await Comment.findAll();
    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments', details: error.message });
  }
};

// Create a new comment (public - allows anonymous viewers)
const createComment = async (req, res) => {
  try {
    const { content } = req.body;
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    // Get user_id from token if authenticated, otherwise null (anonymous)
    let user_id = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        user_id = decoded.userId;
      }
    } catch (err) {
      // Token invalid or missing - allow anonymous comment
      user_id = null;
    }
    
    const comment = await Comment.create({
      content: content.trim(),
      user_id: user_id
    });
    
    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment', details: error.message });
  }
};

// Delete a comment by ID (requires authentication - only authenticated users can delete)
const deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Only allow users to delete their own comments
    if (comment.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }
    
    await Comment.deleteById(req.params.id);
    res.json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
};

// Get comments for a specific drawing
const getDrawingComments = async (req, res) => {
  try {
    const comments = await Comment.findByDrawingId(req.params.id);
    res.json(comments);
  } catch (error) {
    console.error('Error fetching drawing comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments', details: error.message });
  }
};

// Create a comment for a specific drawing
const createDrawingComment = async (req, res) => {
  try {
    const { content } = req.body;
    const drawingId = parseInt(req.params.id);
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Comment content is required' });
    }
    
    // Verify drawing exists
    const drawing = await Drawing.findById(drawingId);
    if (!drawing) {
      return res.status(404).json({ error: 'Drawing not found' });
    }
    
    // Get user_id from token if authenticated, otherwise null (anonymous)
    let user_id = null;
    try {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = jwt.verify(token, JWT_SECRET);
        user_id = decoded.userId;
        
        // Verify the user exists
        const User = require('../models/User');
        const user = await User.findById(user_id);
        if (!user) {
          console.error(`[Drawing Comment] User ID ${user_id} from token not found in database`);
          user_id = null;
        }
      }
    } catch (err) {
      // Token invalid or missing - allow anonymous comment
      user_id = null;
    }
    
    const comment = await Comment.create({
      content: content.trim(),
      user_id: user_id,
      drawing_id: drawingId
    });
    
    res.status(201).json({ success: true, comment });
  } catch (error) {
    console.error('Error creating drawing comment:', error);
    res.status(500).json({ error: 'Failed to create comment', details: error.message });
  }
};

module.exports = {
  getAllComments,
  createComment,
  deleteComment,
  getDrawingComments,
  createDrawingComment
};

