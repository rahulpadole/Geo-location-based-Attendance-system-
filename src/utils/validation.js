// Email validation
export const isValidEmail = (email) => {
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).toLowerCase());
};

// Phone validation (international format)
export const isValidPhone = (phone) => {
  const re = /^\+?[1-9]\d{1,14}$/; // E.164 format
  return re.test(String(phone).replace(/\s/g, ''));
};

// Required fields validation
export const validateRequired = (fields, data) => {
  const errors = {};
  fields.forEach(field => {
    if (!data[field] || String(data[field]).trim() === '') {
      errors[field] = `${field} is required`;
    }
  });
  return errors;
};

// SQL injection prevention - sanitize input
export const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  // Remove any potential SQL injection patterns
  return input
    .replace(/['"\\;]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*|\*\//g, '');
};

// XSS prevention
export const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Form validation schema
export const validateTeacherForm = (data) => {
  const errors = {};
  
  // Required fields
  if (!data.name?.trim()) errors.name = "Name is required";
  if (!data.email?.trim()) errors.email = "Email is required";
  else if (!isValidEmail(data.email)) errors.email = "Invalid email format";
  
  if (!data.employeeId?.trim()) errors.employeeId = "Employee ID is required";
  if (!data.department?.trim()) errors.department = "Department is required";
  
  // Optional fields with validation
  if (data.phone && !isValidPhone(data.phone)) {
    errors.phone = "Invalid phone number format";
  }
  
  // Password validation for new teachers
  if (!data.id && data.password) {
    if (data.password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(data.password)) {
      errors.password = "Password must contain uppercase, lowercase and number";
    }
  }
  
  return errors;
};