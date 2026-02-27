// User roles
export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher'
};

// Attendance status
export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  HALF_DAY: 'Half Day',
  LEAVE: 'Leave'
};

// Holiday types
export const HOLIDAY_TYPES = {
  HOLIDAY: 'holiday',
  SPECIAL: 'special',
  EVENT: 'event'
};

// Collection names
export const COLLECTIONS = {
  USERS: 'users',
  ATTENDANCE: 'attendance',
  TIMETABLE: 'timetable',
  HOLIDAYS: 'holidays',
  COLLEGE_SETTINGS: 'collegeSettings',
  AUDIT_LOGS: 'auditLogs',
  ACTIVITY_LOGS: 'activity_logs'
};

// Default values
export const DEFAULTS = {
  ATTENDANCE_RADIUS: 150, // meters
  PAGINATION_LIMIT: 40,
  RATE_LIMIT_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW: 60000, // 1 minute
  SESSION_TIMEOUT: 3600000, // 1 hour
  CACHE_DURATION: 300000, // 5 minutes
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000 // 1 second
};

// Error messages
export const ERROR_MESSAGES = {
  NETWORK: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'Resource not found.',
  VALIDATION: 'Please check your input and try again.',
  SERVER: 'Server error. Please try again later.',
  LOCATION: 'Unable to get your location. Please enable location services.',
  CAMERA: 'Camera access denied. Please enable camera permissions.',
  TIMEOUT: 'Request timed out. Please try again.'
};

// Success messages
export const SUCCESS_MESSAGES = {
  ATTENDANCE_MARKED: 'Attendance marked successfully!',
  ATTENDANCE_UPDATED: 'Attendance updated successfully!',
  TEACHER_ADDED: 'Teacher added successfully!',
  TEACHER_UPDATED: 'Teacher updated successfully!',
  HOLIDAY_ADDED: 'Holiday added successfully!',
  SETTINGS_SAVED: 'Settings saved successfully!',
  EXPORT_COMPLETE: 'Export completed successfully!'
};

// Days of week
export const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
];

// Departments
export const DEPARTMENTS = [
  { value: 'CS', label: 'Computer Science' },
  { value: 'IT', label: 'Information Technology' },
  { value: 'ME', label: 'Mechanical' },
  { value: 'EE', label: 'Electrical' },
  { value: 'CE', label: 'Civil' },
  { value: 'EC', label: 'Electronics' }
];

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'theme',
  USER_PREFERENCES: 'userPreferences',
  SESSION: 'session',
  CACHE: 'appCache'
};

// Route paths
export const ROUTES = {
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  TEACHER: {
    DASHBOARD: '/teacher/dashboard',
    ATTENDANCE: '/teacher/attendance',
    LEAVE: '/teacher/leave',
    HISTORY: '/teacher/history',
    PROFILE: '/teacher/profile'
  },
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    COLLEGE_SETTINGS: '/admin/college-settings',
    TIMETABLE: '/admin/timetable',
    TEACHERS: '/admin/teachers',
    TEACHER_ADD: '/admin/teachers/add',
    TEACHER_EDIT: '/admin/teachers/edit/:id',
    HOLIDAYS: '/admin/holidays',
    ATTENDANCE: '/admin/attendance',
    EXPORT: '/admin/export',
    AUDIT_LOGS: '/admin/audit-logs',
    PROFILE: '/admin/profile',
    ADMIN_FORM: '/admin/admin-form',
    ADMIN_EDIT: '/admin/admin-form/:id'
  }
};

// API endpoints (for future cloud functions)
export const API_ENDPOINTS = {
  SEND_EMAIL: '/api/sendEmail',
  GENERATE_REPORT: '/api/generateReport',
  SYNC_DATA: '/api/syncData',
  BACKUP: '/api/backup'
};

// Theme colors
export const COLORS = {
  PRIMARY: '#1976d2',
  SECONDARY: '#2e7d32',
  ERROR: '#d32f2f',
  WARNING: '#ed6c02',
  INFO: '#0288d1',
  SUCCESS: '#2e7d32',
  BACKGROUND: '#f5f5f5',
  SURFACE: '#ffffff',
  TEXT_PRIMARY: '#333333',
  TEXT_SECONDARY: '#666666',
  BORDER: '#dddddd'
};

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY HH:mm',
  ISO: 'YYYY-MM-DD',
  FILE_NAME: 'YYYYMMDD_HHmmss',
  MONTH_YEAR: 'MMMM YYYY'
};