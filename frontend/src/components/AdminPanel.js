import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './AdminPanel.css';

function AdminPanel({ onClose }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(true);

  useEffect(() => {
    // Verify user is admin before showing panel
    verifyAdminAccess();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifyAdminAccess = async () => {
    try {
      const response = await axios.get('/api/auth/me');
      if (response.data.success && response.data.user.isAdmin) {
        setIsAuthorized(true);
      } else {
        setIsAuthorized(false);
        setError('Access denied. Admin privileges required.');
        setTimeout(() => onClose(), 2000);
      }
    } catch (err) {
      setIsAuthorized(false);
      setError('Failed to verify admin access.');
      setTimeout(() => onClose(), 2000);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get('/api/admin/users');
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access denied. You do not have admin privileges.');
        setIsAuthorized(false);
        setTimeout(() => onClose(), 2000);
      } else {
        setError(err.response?.data?.error || 'Failed to fetch users');
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleDrawerStatus = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    setUpdating({ ...updating, [userId]: true });

    try {
      const response = await axios.put(`/api/admin/users/${userId}/drawer`, {
        canDraw: newStatus
      });

      if (response.data.success) {
        // Update the user in the list
        setUsers(users.map(user => 
          user.id === userId 
            ? { ...user, can_draw: newStatus }
            : user
        ));
        
        // If the updated user is the currently logged-in user, refresh their data
        const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
        if (currentUser.id === userId) {
          // Refresh current user data from backend
          try {
            const userResponse = await axios.get('/api/auth/me');
            if (userResponse.data.success) {
              const updatedUser = userResponse.data.user;
              localStorage.setItem('user', JSON.stringify(updatedUser));
              // Trigger custom event for same-tab components
              window.dispatchEvent(new Event('userUpdated'));
              // Trigger storage event for other tabs
              window.dispatchEvent(new StorageEvent('storage', { key: 'user' }));
            }
          } catch (err) {
            console.error('Error refreshing current user data:', err);
          }
        }
      }
    } catch (err) {
      if (err.response?.status === 403) {
        setError('Access denied. You do not have admin privileges.');
        setIsAuthorized(false);
        setTimeout(() => onClose(), 2000);
      } else {
        alert(err.response?.data?.error || 'Failed to update user drawer status');
      }
    } finally {
      setUpdating({ ...updating, [userId]: false });
    }
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: users.length,
    admins: users.filter(u => u.is_admin).length,
    drawers: users.filter(u => u.can_draw === true || u.can_draw === 'true').length,
    viewers: users.filter(u => !(u.can_draw === true || u.can_draw === 'true')).length
  };

  return (
    <div className="admin-panel-overlay" onClick={onClose}>
      <div className="admin-panel" onClick={(e) => e.stopPropagation()}>
        <div className="admin-panel-header">
          <h2>Admin Panel</h2>
          <button className="admin-panel-close" onClick={onClose}>×</button>
        </div>

        <div className="admin-panel-content">
          <p className="admin-panel-description">
            Manage user drawer privileges. You can grant or revoke drawing permissions for users.
          </p>

          {!isAuthorized && (
            <div className="admin-panel-error">
              {error || 'Access denied. Admin privileges required.'}
            </div>
          )}

          {isAuthorized && (
            <>
              <div className="admin-panel-stats">
                <div className="stat-card">
                  <div className="stat-value">{stats.total}</div>
                  <div className="stat-label">Total Users</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{stats.admins}</div>
                  <div className="stat-label">Admins</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value stat-drawers">{stats.drawers}</div>
                  <div className="stat-label">Drawers</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value stat-viewers">{stats.viewers}</div>
                  <div className="stat-label">Viewers</div>
                </div>
              </div>
              <div className="admin-panel-search">
                <input
                  type="text"
                  placeholder="Search users by username..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="admin-search-input"
                />
              </div>

              {error && <div className="admin-panel-error">{error}</div>}

              {loading ? (
                <div className="admin-panel-loading">Loading users...</div>
              ) : (
                <div className="admin-panel-users">
                  <div className="admin-panel-users-header">
                    <span>Username</span>
                    <span>Role</span>
                    <span>Drawer Status</span>
                    <span>Actions</span>
                  </div>
                  {filteredUsers.length === 0 ? (
                    <div className="admin-panel-empty">
                      {searchTerm ? 'No users found matching your search' : 'No users found'}
                    </div>
                  ) : (
                    filteredUsers.map(user => (
                  <div key={user.id} className="admin-panel-user-row">
                    <span className="user-username">
                      {user.username}
                      {user.username === 'Admin2' && (
                        <span className="user-badge">Primary Admin</span>
                      )}
                    </span>
                    <span className="user-status">
                      {user.is_admin ? (
                        <span className="status-badge admin">Admin</span>
                      ) : (
                        <span className="status-badge user">User</span>
                      )}
                    </span>
                    <span className="user-drawer-status">
                      {(user.can_draw === true || user.can_draw === 'true') ? (
                        <span className="status-badge drawer">Drawer</span>
                      ) : (
                        <span className="status-badge viewer">Viewer</span>
                      )}
                    </span>
                    <span className="user-actions">
                      <button
                        className={`toggle-drawer-btn ${(user.can_draw === true || user.can_draw === 'true') ? 'revoke' : 'grant'}`}
                        onClick={() => toggleDrawerStatus(user.id, (user.can_draw === true || user.can_draw === 'true'))}
                        disabled={updating[user.id]}
                      >
                        {updating[user.id] 
                          ? 'Updating...' 
                          : (user.can_draw === true || user.can_draw === 'true')
                            ? 'Revoke Drawing' 
                            : 'Grant Drawing'
                        }
                      </button>
                    </span>
                  </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminPanel;

