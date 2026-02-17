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

// Attendance status
export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  HALF_DAY: 'Half Day',
  LEAVE: 'Leave'
};

// Default values
export const DEFAULTS = {
  ATTENDANCE_RADIUS: 150,
  PAGINATION_LIMIT: 20,
  RATE_LIMIT_ATTEMPTS: 5,
  RATE_LIMIT_WINDOW: 60000,
  SESSION_TIMEOUT: 3600000,
  CACHE_DURATION: 300000,
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000
};