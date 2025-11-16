const ForumCategory = require('../models/ForumCategory');
const ForumThread = require('../models/ForumThread');
const Comment = require('../models/Comment');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../middleware/auth');

// Get all forum categories
const getCategories = async (req, res) => {
  try {
    const categories = await ForumCategory.findAll();
    res.json(categories);
  } catch (error) {
    console.error('Error fetching forum categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories', details: error.message });
  }
};

// Get threads for a category
const getCategoryThreads = async (req, res) => {
  try {
    const threads = await ForumThread.findByCategoryId(req.params.id);
    res.json(threads);
  } catch (error) {
    console.error('Error fetching threads:', error);
    res.status(500).json({ error: 'Failed to fetch threads', details: error.message });
  }
};

// Create a new thread
const createThread = async (req, res) => {
  try {
    const { category_id, title, content } = req.body;
    
    if (!category_id || !title || !content) {
      return res.status(400).json({ error: 'Category ID, title, and content are required' });
    }
    
    if (title.trim().length === 0 || content.trim().length === 0) {
      return res.status(400).json({ error: 'Title and content cannot be empty' });
    }
    
    // Verify category exists
    const category = await ForumCategory.findById(category_id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
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
      // Token invalid or missing - allow anonymous thread
      user_id = null;
    }
    
    // Create thread
    const thread = await ForumThread.create({
      category_id,
      title: title.trim(),
      user_id
    });
    
    // Create first post (OP)
    const post = await Comment.create({
      content: content.trim(),
      user_id,
      thread_id: thread.id
    });
    
    res.status(201).json({ success: true, thread, post });
  } catch (error) {
    console.error('Error creating thread:', error);
    res.status(500).json({ error: 'Failed to create thread', details: error.message });
  }
};

// Get a thread with all posts
const getThread = async (req, res) => {
  try {
    const thread = await ForumThread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    const posts = await Comment.findByThreadId(req.params.id);
    res.json({ thread, posts });
  } catch (error) {
    console.error('Error fetching thread:', error);
    res.status(500).json({ error: 'Failed to fetch thread', details: error.message });
  }
};

// Create a post in a thread
const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const threadId = parseInt(req.params.id);
    
    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Post content is required' });
    }
    
    // Verify thread exists
    const thread = await ForumThread.findById(threadId);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
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
      // Token invalid or missing - allow anonymous post
      user_id = null;
    }
    
    const post = await Comment.create({
      content: content.trim(),
      user_id,
      thread_id: threadId
    });
    
    res.status(201).json({ success: true, post });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post', details: error.message });
  }
};

// Search threads
const searchThreads = async (req, res) => {
  try {
    const { q, category_id } = req.query;
    
    if (!q || q.trim().length === 0) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
    const categoryId = category_id ? parseInt(category_id) : null;
    const threads = await ForumThread.search(q.trim(), categoryId);
    res.json(threads);
  } catch (error) {
    console.error('Error searching threads:', error);
    res.status(500).json({ error: 'Failed to search threads', details: error.message });
  }
};

// Delete a thread (requires authentication)
const deleteThread = async (req, res) => {
  try {
    const thread = await ForumThread.findById(req.params.id);
    if (!thread) {
      return res.status(404).json({ error: 'Thread not found' });
    }
    
    // Only allow users to delete their own threads
    if (thread.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own threads' });
    }
    
    await ForumThread.deleteById(req.params.id);
    res.json({ success: true, message: 'Thread deleted successfully' });
  } catch (error) {
    console.error('Error deleting thread:', error);
    res.status(500).json({ error: 'Failed to delete thread' });
  }
};

module.exports = {
  getCategories,
  getCategoryThreads,
  createThread,
  getThread,
  createPost,
  searchThreads,
  deleteThread
};

