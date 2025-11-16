// Config endpoint - public (needed by viewer page)
const getConfig = (req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ 
      error: 'Google Maps API key is not configured',
      message: 'Please set GOOGLE_MAPS_API_KEY in your backend/.env file'
    });
  }
  res.json({
    googleMapsApiKey: apiKey
  });
};

module.exports = {
  getConfig
};

