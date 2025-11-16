const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initDatabase } = require('./db/connection');
const { authenticateToken } = require('./middleware/auth');
const { isAdmin } = require('./middleware/isAdmin');
const { dbCheck } = require('./middleware/dbCheck');

// Controllers
const authController = require('./controllers/authController');
const configController = require('./controllers/configController');
const drawingController = require('./controllers/drawingController');
const commentController = require('./controllers/commentController');
const forumController = require('./controllers/forumController');
const voteController = require('./controllers/voteController');
const adminController = require('./controllers/adminController');
const healthController = require('./controllers/healthController');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize PostgreSQL database (async)
let dbInitialized = false;
initDatabase()
  .then(() => {
    dbInitialized = true;
    console.log('✅ Database ready');
  })
  .catch((error) => {
    console.error('❌ Failed to initialize database:', error);
    console.error('⚠️  Server will continue but database operations may fail');
    console.error('   Please ensure PostgreSQL is running and database exists');
  });

// Create dbCheck middleware with dbInitialized state
const checkDb = dbCheck(() => dbInitialized);

// Make dbInitialized available to health check
app.use((req, res, next) => {
  req.dbInitialized = dbInitialized;
  next();
});

// Authentication Routes
app.post('/api/auth/register', checkDb, authController.register);
app.post('/api/auth/login', checkDb, authController.login);
app.get('/api/auth/me', authenticateToken, authController.getMe);

// Config Routes
app.get('/api/config', configController.getConfig);

// Drawing Routes
app.get('/api/drawings', checkDb, drawingController.getAllDrawings);
app.get('/api/drawings/:id', checkDb, drawingController.getDrawingById);
app.post('/api/drawings', authenticateToken, checkDb, drawingController.createDrawing);
app.delete('/api/drawings/:id', authenticateToken, checkDb, drawingController.deleteDrawing);

// Comment Routes
app.get('/api/comments', checkDb, commentController.getAllComments);
app.post('/api/comments', checkDb, commentController.createComment);
app.delete('/api/comments/:id', authenticateToken, checkDb, commentController.deleteComment);

// Drawing-specific Comments Routes
app.get('/api/drawings/:id/comments', checkDb, commentController.getDrawingComments);
app.post('/api/drawings/:id/comments', checkDb, commentController.createDrawingComment);

// Forum Routes
app.get('/api/forum/categories', checkDb, forumController.getCategories);
app.get('/api/forum/categories/:id/threads', checkDb, forumController.getCategoryThreads);
app.post('/api/forum/threads', checkDb, forumController.createThread);
app.get('/api/forum/threads/:id', checkDb, forumController.getThread);
app.post('/api/forum/threads/:id/posts', checkDb, forumController.createPost);
app.get('/api/forum/search', checkDb, forumController.searchThreads);
app.delete('/api/forum/threads/:id', authenticateToken, checkDb, forumController.deleteThread);

// Vote Routes
app.post('/api/drawings/:id/vote/:voteType', authenticateToken, checkDb, voteController.voteOnDrawing);
app.get('/api/drawings/:id/votes', authenticateToken, isAdmin, checkDb, voteController.getVoteCounts);

// Admin Routes
app.get('/api/admin/users', authenticateToken, isAdmin, checkDb, adminController.getAllUsers);
app.put('/api/admin/users/:id/admin', authenticateToken, isAdmin, checkDb, adminController.updateUserAdminStatus);
app.put('/api/admin/users/:id/drawer', authenticateToken, isAdmin, checkDb, adminController.updateUserDrawerStatus);

// Health and Test Routes
app.get('/api/health', healthController.getHealth);
app.get('/api/test-admin', checkDb, healthController.testAdmin);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
