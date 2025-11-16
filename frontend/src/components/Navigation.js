import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import Logo from './Logo';

function Navigation() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Function to update user from localStorage
    const updateUser = () => {
      const savedUser = localStorage.getItem('user');
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser));
        } catch (error) {
          console.error('Error parsing user data:', error);
        }
      } else {
        setUser(null);
      }
    };

    // Initial load
    updateUser();

    // Listen for storage changes (when user data is updated in other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'user') {
        updateUser();
      }
    };

    // Listen for custom user update events (same-tab updates)
    const handleUserUpdate = () => {
      updateUser();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('userUpdated', handleUserUpdate);
    
    // Also check periodically for changes
    const interval = setInterval(() => {
      updateUser();
    }, 2000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('userUpdated', handleUserUpdate);
      clearInterval(interval);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    window.location.href = '/';
  };

  const isHomePage = location.pathname === '/';

  return (
    <nav className="bg-transparent sticky top-0 z-[1000] py-4 relative">
      <div className="w-full px-5 flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {!isHomePage && (
            <Link to="/" className="flex items-center gap-3 text-2xl font-bold text-white no-underline transition-all hover:scale-105 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
              <Logo size={40} className="drop-shadow-[0_2px_8px_rgba(102,126,234,0.5)]" />
              City Concepter
            </Link>
          )}
          {!isHomePage && (
            <div className="flex gap-3 flex-wrap">
              <Link 
                to="/" 
                className={`text-white no-underline font-semibold px-5 py-2 rounded-lg transition-all backdrop-blur-sm border border-white/20 hover:bg-white/30 hover:-translate-y-0.5 hover:scale-105 ${
                  location.pathname === '/' ? 'bg-white/30 shadow-[0_4px_15px_rgba(255,255,255,0.3)]' : 'bg-white/10'
                }`}
              >
                Home
              </Link>
              <Link 
                to="/viewer" 
                className={`text-white no-underline font-semibold px-5 py-2 rounded-lg transition-all backdrop-blur-sm border border-white/20 hover:bg-white/30 hover:-translate-y-0.5 hover:scale-105 ${
                  location.pathname === '/viewer' ? 'bg-white/30 shadow-[0_4px_15px_rgba(255,255,255,0.3)]' : 'bg-white/10'
                }`}
              >
                Viewer
              </Link>
              {user && (user.canDraw === true || user.isAdmin === true) && (
                <Link 
                  to="/drawer" 
                  className={`text-white no-underline font-semibold px-5 py-2 rounded-lg transition-all backdrop-blur-sm border border-white/20 hover:bg-white/30 hover:-translate-y-0.5 hover:scale-105 ${
                    location.pathname === '/drawer' ? 'bg-white/30 shadow-[0_4px_15px_rgba(255,255,255,0.3)]' : 'bg-white/10'
                  }`}
                >
                  Drawer
                </Link>
              )}
            </div>
          )}
        </div>
        {user && !isHomePage && (
          <div className="flex items-center gap-3 flex-wrap ml-auto mr-8">
            <span className="text-white text-sm font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/20">
              Logged in as: <strong>{user?.username}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-[#dc3545]/90 backdrop-blur-sm text-white border-none rounded-lg cursor-pointer text-sm font-semibold hover:bg-[#c82333] transition-all hover:scale-105 shadow-lg"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

export default Navigation;

