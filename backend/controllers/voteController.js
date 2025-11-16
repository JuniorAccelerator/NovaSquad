const Drawing = require('../models/Drawing');
const Vote = require('../models/Vote');

// Upvote or downvote a drawing (requires authentication)
const voteOnDrawing = async (req, res) => {
  try {
    const drawingId = parseInt(req.params.id);
    const userId = req.user.id;
    const voteType = req.params.voteType; // 'upvote' or 'downvote'
    
    if (!['upvote', 'downvote'].includes(voteType)) {
      return res.status(400).json({ error: 'Invalid vote type. Must be "upvote" or "downvote"' });
    }
    
    // Verify drawing exists
    const drawing = await Drawing.findById(drawingId);
    if (!drawing) {
      return res.status(404).json({ error: 'Drawing not found' });
    }
    
    // Set vote (handles add, update, or remove)
    const result = await Vote.setVote(drawingId, userId, voteType);
    const userVote = await Vote.getUserVote(drawingId, userId);
    
    // Get vote counts for all users
    const voteCounts = await Vote.getVoteCounts(drawingId);
    
    res.json({ 
      success: true, 
      action: result.action,
      userVote: userVote,
      upvotes: voteCounts.upvotes,
      downvotes: voteCounts.downvotes
    });
  } catch (error) {
    console.error('Error voting on drawing:', error);
    res.status(500).json({ error: 'Failed to vote', details: error.message });
  }
};

// Get vote counts for a drawing (admin only)
const getVoteCounts = async (req, res) => {
  try {
    const drawingId = parseInt(req.params.id);
    const voteCounts = await Vote.getVoteCounts(drawingId);
    
    // Get user vote if authenticated
    let userVote = null;
    try {
      userVote = await Vote.getUserVote(drawingId, req.user.id);
    } catch (err) {
      // Continue without user vote
    }
    
    res.json({ 
      upvotes: voteCounts.upvotes, 
      downvotes: voteCounts.downvotes,
      userVote: userVote
    });
  } catch (error) {
    console.error('Error fetching vote count:', error);
    res.status(500).json({ error: 'Failed to fetch vote count', details: error.message });
  }
};

module.exports = {
  voteOnDrawing,
  getVoteCounts
};

