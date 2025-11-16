import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import Login from '../components/Login';
import AdminPanel from '../components/AdminPanel';
import Logo from '../components/Logo';
import building2Image from '../assets/building2.png';

function Home() {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    // Disable body scrolling when on home page
    document.body.style.overflow = 'hidden';
    
    // Check if user is already logged in
    const token = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('user');
    let interval = null;
    
    if (token && savedUser) {
      const userData = JSON.parse(savedUser);
      setIsAuthenticated(true);
      setUser(userData);
      
      // Verify user status with backend
      const verifyUser = async () => {
        try {
          const response = await axios.get('/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (response.data.success) {
            setUser(response.data.user);
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
        } catch (error) {
          console.error('Error verifying user:', error);
        }
      };
      verifyUser();
      
      // Periodically refresh user data to catch privilege changes
      interval = setInterval(verifyUser, 2000);
    }
    
    // Cleanup: re-enable scrolling when component unmounts
    return () => {
      if (interval) {
        clearInterval(interval);
      }
      document.body.style.overflow = '';
    };
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
    setShowLoginModal(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <div className="h-screen w-full relative z-10 overflow-hidden">
      {showAdminPanel && user && user.isAdmin === true && <AdminPanel onClose={() => setShowAdminPanel(false)} />}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-5" onClick={() => setShowLoginModal(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <Login onLogin={handleLogin} onClose={() => setShowLoginModal(false)} />
          </div>
        </div>
      )}
      <div className="fixed top-5 right-5 z-20">
        <div className="flex items-center gap-3 flex-wrap justify-end">
          {isAuthenticated ? (
            <>
              <span className="text-white text-sm font-medium drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/20">
                Logged in as: <strong>{user?.username}</strong>
              </span>
              {user && user.isAdmin === true && (
                <button
                  onClick={() => setShowAdminPanel(true)}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-lg cursor-pointer text-sm font-semibold hover:bg-white/30 transition-all hover:scale-105 shadow-lg"
                >
                  Admin Panel
                </button>
              )}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-[#dc3545]/90 backdrop-blur-sm text-white border-none rounded-lg cursor-pointer text-sm font-semibold hover:bg-[#c82333] transition-all hover:scale-105 shadow-lg"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowLoginModal(true)}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-lg cursor-pointer text-sm font-semibold hover:bg-white/30 transition-all hover:scale-105 shadow-lg"
            >
              Login
            </button>
          )}
        </div>
      </div>
      
      {/* Building image - Absolutely positioned */}
      <div className="absolute left-0 top-0 h-full">
        <img 
          src={building2Image} 
          alt="Building" 
          className="h-full w-auto object-cover"
        />
      </div>

      {/* Content - Centered in the middle */}
      <div className="absolute inset-0 flex items-center justify-center p-5">
        <div className="max-w-[600px] w-full text-center relative z-10">
          <div className="text-white flex flex-col items-center gap-6">
            {/* Logo and Title - Centered */}
            <div className="flex flex-col items-center gap-4 animate-fade-in">
              <div className="flex items-center justify-center gap-4">
                <Logo size={80} className="drop-shadow-[0_4px_20px_rgba(102,126,234,0.6)]" />
                <h1 className="text-[3.5em] md:text-[2.5em] font-bold drop-shadow-[0_4px_20px_rgba(0,0,0,0.4)]">City Concepter</h1>
              </div>
              
              {/* Motto */}
              <p className="text-[1.8em] md:text-[1.5em] font-semibold opacity-95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)]">
                We hear you!
              </p>
            </div>

            {/* About the site */}
            <p className="text-[1.3em] md:text-[1.1em] opacity-95 drop-shadow-[0_2px_8px_rgba(0,0,0,0.3)] max-w-[500px]">
              Welcome to City Concepter, an interactive platform where you can visualize and design urban concepts on an interactive map. 
              Explore existing city designs in Viewer Mode, or contribute your own ideas in Drawer Mode. 
              Join our community to share, discuss, and shape the future of urban planning.
            </p>

            {/* Viewer Mode Button */}
            <div className="w-full max-w-[400px]">
              <button 
                onClick={() => navigate('/viewer')}
                className="w-full px-10 py-5 text-2xl md:text-xl md:px-8 md:py-4 font-semibold border-none rounded-xl cursor-pointer text-white shadow-[0_8px_30px_rgba(79,172,254,0.4)] transition-all hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(79,172,254,0.6)] active:translate-y-0 backdrop-blur-sm bg-white/10 border border-white/20"
                style={{ background: 'linear-gradient(135deg, rgba(79, 172, 254, 0.9) 0%, rgba(0, 242, 254, 0.9) 100%)' }}
              >
                Viewer Mode
              </button>
              {isAuthenticated && user && (user.canDraw === true || user.isAdmin === true) && (
                <button 
                  onClick={() => navigate('/drawer')}
                  className="w-full mt-6 px-10 py-5 text-2xl md:text-xl md:px-8 md:py-4 font-semibold border-none rounded-xl cursor-pointer text-white shadow-[0_8px_30px_rgba(250,112,154,0.4)] transition-all hover:-translate-y-2 hover:shadow-[0_12px_40px_rgba(250,112,154,0.6)] active:translate-y-0 backdrop-blur-sm bg-white/10 border border-white/20"
                  style={{ background: 'linear-gradient(135deg, rgba(250, 112, 154, 0.9) 0%, rgba(255, 159, 64, 0.9) 100%)' }}
                >
                  Drawer Mode
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
