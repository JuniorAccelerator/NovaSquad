// Middleware factory to check if database is initialized
const dbCheck = (getDbInitialized) => {
  return (req, res, next) => {
    const dbInitialized = typeof getDbInitialized === 'function' ? getDbInitialized() : getDbInitialized;
    if (!dbInitialized) {
      return res.status(503).json({ error: 'Database not initialized. Please wait a moment and try again.' });
    }
    next();
  };
};

module.exports = { dbCheck };

