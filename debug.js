// Run this to check all component exports
const fs = require('fs');
const path = require('path');

const components = [
  'src/admin/Dashboard.js',
  'src/admin/Timetable.js',
  'src/admin/CollegeSettings.js',
  'src/admin/Teachers.js',
  'src/admin/TeacherForm.js',
  'src/admin/Holidays.js',
  'src/admin/Attendance.js',
  'src/admin/Export.js',
  'src/admin/AuditLogs.js',
  'src/admin/Profile.js',
  'src/admin/AdminForm.js',
  'src/components/ResponsiveNavbar.js',
  'src/components/Footer.js'
];

components.forEach(file => {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const hasDefaultExport = content.includes('export default');
    console.log(`${file}: ${hasDefaultExport ? '✅ Has default export' : '❌ No default export'}`);
  } catch (err) {
    console.log(`${file}: ❌ File not found`);
  }
});