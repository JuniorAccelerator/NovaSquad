import React, { useState } from 'react';
import axios from 'axios';

function Login({ onLogin, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (loginUsername, loginPassword) => {
    setError('');
    setLoading(true);

    try {
      const endpoint = '/api/auth/login';
      const response = await axios.post(endpoint, { username: loginUsername, password: loginPassword });

      if (response.data.success && response.data.token) {
        // Ensure isAdmin and canDraw are set (default to false if undefined)
        const userData = {
          ...response.data.user,
          isAdmin: response.data.user.isAdmin || false,
          canDraw: response.data.user.canDraw === true
        };
        
        // Store token in localStorage
        localStorage.setItem('authToken', response.data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Set default axios header for future requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        // Call onLogin callback with user data including isAdmin and canDraw
        onLogin(userData);
      }
    } catch (error) {
      setError(
        error.response?.data?.error || 
        'Failed to login. Please check your credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    if (isRegistering) {
      // Handle registration
      setError('');
      setLoading(true);

      try {
        const response = await axios.post('/api/auth/register', {
          username: username.trim(),
          password: password
        });

        if (response.data.success && response.data.token) {
          // Ensure isAdmin and canDraw are set (default to false if undefined)
          const userData = {
            ...response.data.user,
            isAdmin: response.data.user.isAdmin || false,
            canDraw: response.data.user.canDraw === true
          };
          
          // Store token in localStorage
          localStorage.setItem('authToken', response.data.token);
          localStorage.setItem('user', JSON.stringify(userData));
          
          // Set default axios header for future requests
          axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
          
          // Call onLogin callback with user data including isAdmin and canDraw
          onLogin(userData);
        }
      } catch (err) {
        setError(
          err.response?.data?.error || 
          'Failed to register. Please try again.'
        );
      } finally {
        setLoading(false);
      }
    } else {
      await handleLogin(username, password);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-[80vh] p-5 relative z-10">
      <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] p-10 w-full max-w-[400px] animate-slide-in border border-white/20 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-none border-none cursor-pointer text-[#666] text-2xl hover:text-[#333] transition-colors p-1"
            aria-label="Close"
          >
            ×
          </button>
        )}
        <h2 className="m-0 mb-2.5 text-[#333] text-[28px] text-center">{isRegistering ? 'Create Account' : 'Login'}</h2>
        <p className="text-center text-[#666] mb-8 text-sm">
          {isRegistering 
            ? 'Create an account to start drawing on the map' 
            : 'Please login to access the drawing page'}
        </p>
        
        {error && <div className="bg-[#fee] border border-[#fcc] text-[#c33] p-3 rounded-md mb-5 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="username" className="font-semibold text-[#333] text-sm">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter your username"
              required
              minLength={3}
              disabled={loading}
              className="p-3 border-2 border-[#e0e0e0] rounded-md text-base transition-colors w-full box-border focus:outline-none focus:border-primary disabled:bg-[#f5f5f5] disabled:cursor-not-allowed"
            />
          </div>
          
          <div className="flex flex-col gap-2">
            <label htmlFor="password" className="font-semibold text-[#333] text-sm">Password</label>
            <div className="relative w-full">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                minLength={6}
                disabled={loading}
                className="p-3 pr-11 border-2 border-[#e0e0e0] rounded-md text-base transition-colors w-full box-border focus:outline-none focus:border-primary disabled:bg-[#f5f5f5] disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-none border-none cursor-pointer p-1 text-[#666] text-sm"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="p-3.5 bg-primary text-white border-none rounded-md text-base font-semibold cursor-pointer transition-all mt-2.5 disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-0.5 hover:shadow-[0_5px_15px_rgba(102,126,234,0.4)] active:translate-y-0"
            style={{ background: '#667eea' }}
            disabled={loading}
          >
            {loading ? 'Please wait...' : (isRegistering ? 'Register' : 'Login')}
          </button>
        </form>
        
        <div className="mt-5 text-center text-[#666] text-sm">
          <p>
            {isRegistering ? 'Already have an account? ' : "Don't have an account? "}
            <button 
              type="button" 
              className="bg-none border-none text-primary cursor-pointer font-semibold underline text-sm p-0 ml-1 disabled:opacity-60 disabled:cursor-not-allowed hover:text-primary-dark"
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError('');
              }}
              disabled={loading}
            >
              {isRegistering ? 'Login' : 'Register'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;

