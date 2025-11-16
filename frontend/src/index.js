import React from 'react';
import ReactDOM from 'react-dom/client';
import axios from 'axios';
import './index.css';
import App from './App';

// Configure axios to connect to backend
// Use environment variable if set, otherwise default to localhost:5000
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Set up axios interceptor to include auth token from localStorage
const token = localStorage.getItem('authToken');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

