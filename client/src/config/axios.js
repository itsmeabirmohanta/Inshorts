import axios from 'axios';
import API_ENDPOINTS from './api';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: API_ENDPOINTS.BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add JWT token to all requests
axiosInstance.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    try {
      const userData = localStorage.getItem('user');
      if (userData) {
        const parsed = JSON.parse(userData);
        if (parsed.token) {
          config.headers.Authorization = `Bearer ${parsed.token}`;
        }
      }
    } catch (err) {
      console.error('Failed to attach auth token:', err);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle authentication errors
      if (error.response.status === 401) {
        // Token expired or invalid
        localStorage.removeItem('user');
        window.location.href = '/';
      }
      
      // Handle forbidden errors
      if (error.response.status === 403) {
        console.error('Access denied');
      }
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
