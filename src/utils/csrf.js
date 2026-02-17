// Simple CSRF token generation and validation
export const generateCSRFToken = () => {
  const token = Math.random().toString(36).substring(2) + 
                Math.random().toString(36).substring(2);
  sessionStorage.setItem('csrf_token', token);
  return token;
};

export const validateCSRFToken = (token) => {
  const storedToken = sessionStorage.getItem('csrf_token');
  return storedToken && token === storedToken;
};

export const getCSRFToken = () => {
  return sessionStorage.getItem('csrf_token') || generateCSRFToken();
};

// Add to all forms
export const CSRFField = () => {
  const token = getCSRFToken();
  return <input type="hidden" name="csrf_token" value={token} />;
};