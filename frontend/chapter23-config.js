// Chapter 23 Configuration
// Connects to the Express & MongoDB backend API
window.CHAPTER23_CONFIG = {
  apiBaseUrl: window.location.origin.includes(':5000')
    ? '/api'
    : (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')
        ? 'http://localhost:5000/api'
        : '/api'),
  currency: 'INR'
};
