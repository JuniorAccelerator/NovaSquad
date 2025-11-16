const User = require('../models/User');

// Get all users (admin only)
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users', details: error.message });
  }
};

// Update user admin status (admin only) - DISABLED: Admins can no longer promote users to admin
const updateUserAdminStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isAdmin: newAdminStatus } = req.body;
    
    if (typeof newAdminStatus !== 'boolean') {
      return res.status(400).json({ error: 'isAdmin must be a boolean value' });
    }
    
    // Prevent making users admins - admins can only remove admin status (except Admin2)
    if (newAdminStatus === true) {
      return res.status(403).json({ error: 'Admins cannot promote users to admin. Only drawer status can be managed.' });
    }
    
    // Prevent removing admin status from Admin2
    const targetUser = await User.findById(id);
    if (targetUser && targetUser.username === 'Admin2' && newAdminStatus === false) {
      return res.status(400).json({ error: 'Cannot remove admin status from Admin2 account' });
    }
    
    const updatedUser = await User.updateAdminStatus(id, newAdminStatus);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: `User removed from admin successfully`,
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error updating user admin status:', error);
    res.status(500).json({ error: 'Failed to update user admin status', details: error.message });
  }
};

// Update user drawer status (admin only)
const updateUserDrawerStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { canDraw } = req.body;
    
    if (typeof canDraw !== 'boolean') {
      return res.status(400).json({ error: 'canDraw must be a boolean value' });
    }
    
    const updatedUser = await User.updateDrawerStatus(id, canDraw);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ 
      success: true, 
      message: `User ${canDraw ? 'granted' : 'revoked'} drawer privileges successfully`,
      user: updatedUser 
    });
  } catch (error) {
    console.error('Error updating user drawer status:', error);
    res.status(500).json({ error: 'Failed to update user drawer status', details: error.message });
  }
};

module.exports = {
  getAllUsers,
  updateUserAdminStatus,
  updateUserDrawerStatus
};

