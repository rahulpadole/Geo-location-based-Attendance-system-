/**
 * Database Migration Script
 * 
 * This script fixes inconsistent data structures in Firestore:
 * 1. Standardizes field names (isActive vs active)
 * 2. Ensures consistent timestamp fields
 * 3. Validates and fixes late reasons
 * 4. Adds missing required fields
 * 
 * Run with: node src/scripts/migrateData.js
 */

// Use require for Node.js scripts
const { db } = require("../services/firebase.config");
const { 
  collection, 
  getDocs, 
  doc, 
  writeBatch,
  Timestamp 
} = require("firebase/firestore");

// Colors for console output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m"
};

function log(message, color = colors.reset) {
  console.log(color + message + colors.reset);
}

function logSuccess(message) {
  log("✅ " + message, colors.green);
}

function logWarning(message) {
  log("⚠️  " + message, colors.yellow);
}

function logError(message) {
  log("❌ " + message, colors.red);
}

function logInfo(message) {
  log("📌 " + message, colors.cyan);
}

function logProgress(message) {
  log("🔄 " + message, colors.blue);
}

async function migrateUsers() {
  logProgress("Checking users collection...");
  const usersSnap = await getDocs(collection(db, "users"));
  logInfo(`Found ${usersSnap.size} users`);
  
  const batch = writeBatch(db);
  let updatedCount = 0;
  let warnings = [];

  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const updates = {};
    const userId = userDoc.id;
    
    // Fix 1: Standardize isActive vs active
    if (data.active !== undefined) {
      if (data.isActive === undefined) {
        updates.isActive = data.active;
        logSuccess(`User ${userId}: Added isActive field (value: ${data.active})`);
        updatedCount++;
      }
      
      // Don't delete active yet - might be used by other parts
      // We'll keep both during transition
    }
    
    // Fix 2: Ensure createdAt exists
    if (!data.createdAt) {
      if (data.timestamp) {
        updates.createdAt = data.timestamp;
        logSuccess(`User ${userId}: Converted timestamp to createdAt`);
      } else {
        updates.createdAt = Timestamp.now();
        logWarning(`User ${userId}: Added missing createdAt with current time`);
        warnings.push(`User ${userId}: Added missing createdAt`);
      }
      updatedCount++;
    }
    
    // Fix 3: Add updatedAt if missing
    if (!data.updatedAt) {
      updates.updatedAt = Timestamp.now();
      updatedCount++;
    }
    
    // Fix 4: Ensure role is set
    if (!data.role) {
      updates.role = 'teacher'; // Default to teacher if not specified
      logWarning(`User ${userId}: Added default role 'teacher'`);
      warnings.push(`User ${userId}: Added default role`);
      updatedCount++;
    }
    
    // Fix 5: Ensure isActive boolean
    if (data.isActive === undefined && updates.isActive === undefined) {
      updates.isActive = true;
      logWarning(`User ${userId}: Added default isActive = true`);
      warnings.push(`User ${userId}: Added default isActive`);
      updatedCount++;
    }
    
    // Fix 6: Validate email format
    if (data.email && !data.email.includes('@')) {
      logError(`User ${userId}: Invalid email format - ${data.email}`);
      warnings.push(`User ${userId}: Invalid email format`);
    }
    
    // Fix 7: Ensure name exists
    if (!data.name && data.email) {
      updates.name = data.email.split('@')[0];
      logWarning(`User ${userId}: Added name from email`);
      warnings.push(`User ${userId}: Added name from email`);
      updatedCount++;
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, "users", userId), updates);
    }
  }
  
  return { batch, updatedCount, warnings };
}

async function migrateAttendance() {
  logProgress("Checking attendance collection...");
  const attendanceSnap = await getDocs(collection(db, "attendance"));
  logInfo(`Found ${attendanceSnap.size} attendance records`);
  
  const batch = writeBatch(db);
  let updatedCount = 0;
  let warnings = [];

  for (const attDoc of attendanceSnap.docs) {
    const data = attDoc.data();
    const updates = {};
    const attId = attDoc.id;
    
    // Fix 1: Standardize timestamp fields
    if (data.timestamp && !data.createdAt) {
      updates.createdAt = data.timestamp;
      logSuccess(`Attendance ${attId}: Converted timestamp to createdAt`);
      updatedCount++;
    }
    
    // Fix 2: Validate lateReason
    if (data.status === 'Late') {
      if (!data.lateReason || data.lateReason.trim() === '') {
        updates.lateReason = 'Not specified';
        logWarning(`Attendance ${attId}: Added default late reason`);
        warnings.push(`Attendance ${attId}: Added default late reason`);
        updatedCount++;
      }
    }
    
    // Fix 3: Ensure date field exists
    if (!data.date) {
      if (data.timestamp) {
        const date = data.timestamp.toDate();
        updates.date = date.toISOString().split('T')[0];
        logWarning(`Attendance ${attId}: Added date from timestamp`);
        warnings.push(`Attendance ${attId}: Added date from timestamp`);
      } else {
        updates.date = new Date().toISOString().split('T')[0];
        logError(`Attendance ${attId}: Missing date - using today`);
        warnings.push(`Attendance ${attId}: Missing date - using today`);
      }
      updatedCount++;
    }
    
    // Fix 4: Ensure userId exists
    if (!data.userId && data.teacherId) {
      updates.userId = data.teacherId;
      logWarning(`Attendance ${attId}: Renamed teacherId to userId`);
      warnings.push(`Attendance ${attId}: Renamed teacherId to userId`);
      updatedCount++;
    }
    
    // Fix 5: Ensure status is valid
    const validStatuses = ['Present', 'Late', 'Absent', 'Half Day', 'Leave'];
    if (data.status && !validStatuses.includes(data.status)) {
      updates.status = 'Present';
      logWarning(`Attendance ${attId}: Invalid status "${data.status}" - set to Present`);
      warnings.push(`Attendance ${attId}: Invalid status changed to Present`);
      updatedCount++;
    }
    
    // Fix 6: Add missing status
    if (!data.status) {
      updates.status = 'Present';
      logWarning(`Attendance ${attId}: Added missing status - set to Present`);
      warnings.push(`Attendance ${attId}: Added missing status`);
      updatedCount++;
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, "attendance", attId), updates);
    }
  }
  
  return { batch, updatedCount, warnings };
}

async function migrateHolidays() {
  logProgress("Checking holidays collection...");
  const holidaysSnap = await getDocs(collection(db, "holidays"));
  logInfo(`Found ${holidaysSnap.size} holidays`);
  
  const batch = writeBatch(db);
  let updatedCount = 0;
  let warnings = [];

  for (const holidayDoc of holidaysSnap.docs) {
    const data = holidayDoc.data();
    const updates = {};
    const holidayId = holidayDoc.id;
    
    // Fix 1: Standardize type field
    const validTypes = ['holiday', 'special', 'event'];
    if (data.type && !validTypes.includes(data.type)) {
      updates.type = 'holiday';
      logWarning(`Holiday ${holidayId}: Invalid type "${data.type}" - set to holiday`);
      warnings.push(`Holiday ${holidayId}: Invalid type changed`);
      updatedCount++;
    }
    
    if (!data.type) {
      if (data.isSpecialEvent) {
        updates.type = 'special';
        logWarning(`Holiday ${holidayId}: Converted isSpecialEvent to type='special'`);
      } else {
        updates.type = 'holiday';
        logWarning(`Holiday ${holidayId}: Added missing type - set to holiday`);
      }
      warnings.push(`Holiday ${holidayId}: Added type field`);
      updatedCount++;
    }
    
    // Fix 2: Ensure date format is YYYY-MM-DD
    if (data.date) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(data.date)) {
        try {
          const date = new Date(data.date);
          updates.date = date.toISOString().split('T')[0];
          logWarning(`Holiday ${holidayId}: Fixed date format: ${data.date} -> ${updates.date}`);
          warnings.push(`Holiday ${holidayId}: Fixed date format`);
          updatedCount++;
        } catch (e) {
          logError(`Holiday ${holidayId}: Invalid date - ${data.date}`);
        }
      }
    }
    
    // Fix 3: Add createdAt if missing
    if (!data.createdAt) {
      updates.createdAt = Timestamp.now();
      logWarning(`Holiday ${holidayId}: Added missing createdAt`);
      warnings.push(`Holiday ${holidayId}: Added createdAt`);
      updatedCount++;
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, "holidays", holidayId), updates);
    }
  }
  
  return { batch, updatedCount, warnings };
}

async function migrateCollegeSettings() {
  logProgress("Checking collegeSettings collection...");
  const settingsSnap = await getDocs(collection(db, "collegeSettings"));
  logInfo(`Found ${settingsSnap.size} settings documents`);
  
  const batch = writeBatch(db);
  let updatedCount = 0;
  let warnings = [];

  for (const settingsDoc of settingsSnap.docs) {
    const data = settingsDoc.data();
    const updates = {};
    const settingsId = settingsDoc.id;
    
    // Fix 1: Ensure radius exists
    if (!data.radius && data.radius !== 0) {
      updates.radius = 150; // Default 150 meters
      logWarning(`Settings ${settingsId}: Added default radius 150m`);
      warnings.push(`Settings ${settingsId}: Added default radius`);
      updatedCount++;
    }
    
    // Fix 2: Ensure coordinates are numbers
    if (data.latitude && typeof data.latitude === 'string') {
      updates.latitude = parseFloat(data.latitude);
      logWarning(`Settings ${settingsId}: Converted latitude to number`);
      warnings.push(`Settings ${settingsId}: Converted latitude`);
      updatedCount++;
    }
    
    if (data.longitude && typeof data.longitude === 'string') {
      updates.longitude = parseFloat(data.longitude);
      logWarning(`Settings ${settingsId}: Converted longitude to number`);
      warnings.push(`Settings ${settingsId}: Converted longitude`);
      updatedCount++;
    }
    
    // Fix 3: Add updatedAt if missing
    if (!data.updatedAt) {
      updates.updatedAt = Timestamp.now();
      logWarning(`Settings ${settingsId}: Added missing updatedAt`);
      warnings.push(`Settings ${settingsId}: Added updatedAt`);
      updatedCount++;
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, "collegeSettings", settingsId), updates);
    }
  }
  
  return { batch, updatedCount, warnings };
}

async function migrateAuditLogs() {
  logProgress("Checking auditLogs collection...");
  const logsSnap = await getDocs(collection(db, "auditLogs"));
  logInfo(`Found ${logsSnap.size} audit logs`);
  
  const batch = writeBatch(db);
  let updatedCount = 0;
  let warnings = [];

  for (const logDoc of logsSnap.docs) {
    const data = logDoc.data();
    const updates = {};
    const logId = logDoc.id;
    
    // Fix 1: Ensure timestamp exists
    if (!data.timestamp) {
      if (data.createdAt) {
        updates.timestamp = data.createdAt;
        logWarning(`AuditLog ${logId}: Using createdAt as timestamp`);
      } else {
        updates.timestamp = Timestamp.now();
        logWarning(`AuditLog ${logId}: Added missing timestamp`);
      }
      warnings.push(`AuditLog ${logId}: Fixed timestamp`);
      updatedCount++;
    }
    
    // Fix 2: Ensure action exists
    if (!data.action) {
      updates.action = 'UNKNOWN_ACTION';
      logWarning(`AuditLog ${logId}: Added missing action`);
      warnings.push(`AuditLog ${logId}: Added action`);
      updatedCount++;
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, "auditLogs", logId), updates);
    }
  }
  
  return { batch, updatedCount, warnings };
}

async function migrateTimetable() {
  logProgress("Checking timetable collection...");
  const timetableSnap = await getDocs(collection(db, "timetable"));
  logInfo(`Found ${timetableSnap.size} timetable entries`);
  
  const batch = writeBatch(db);
  let updatedCount = 0;
  let warnings = [];

  for (const timetableDoc of timetableSnap.docs) {
    const data = timetableDoc.data();
    const updates = {};
    const day = timetableDoc.id;
    
    // Fix 1: Ensure startTime exists
    if (!data.startTime) {
      updates.startTime = '09:00';
      logWarning(`Timetable ${day}: Added default startTime 09:00`);
      warnings.push(`Timetable ${day}: Added startTime`);
      updatedCount++;
    }
    
    // Fix 2: Ensure lateAfter exists
    if (!data.lateAfter) {
      updates.lateAfter = '09:15';
      logWarning(`Timetable ${day}: Added default lateAfter 09:15`);
      warnings.push(`Timetable ${day}: Added lateAfter`);
      updatedCount++;
    }
    
    // Fix 3: Ensure endTime exists
    if (!data.endTime) {
      updates.endTime = day === 'saturday' ? '13:00' : '17:00';
      logWarning(`Timetable ${day}: Added default endTime ${updates.endTime}`);
      warnings.push(`Timetable ${day}: Added endTime`);
      updatedCount++;
    }
    
    // Fix 4: Validate time format (HH:MM)
    const timePattern = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    
    if (data.startTime && !timePattern.test(data.startTime)) {
      updates.startTime = '09:00';
      logWarning(`Timetable ${day}: Fixed startTime format`);
      warnings.push(`Timetable ${day}: Fixed startTime`);
      updatedCount++;
    }
    
    if (data.lateAfter && !timePattern.test(data.lateAfter)) {
      updates.lateAfter = '09:15';
      logWarning(`Timetable ${day}: Fixed lateAfter format`);
      warnings.push(`Timetable ${day}: Fixed lateAfter`);
      updatedCount++;
    }
    
    if (data.endTime && !timePattern.test(data.endTime)) {
      updates.endTime = day === 'saturday' ? '13:00' : '17:00';
      logWarning(`Timetable ${day}: Fixed endTime format`);
      warnings.push(`Timetable ${day}: Fixed endTime`);
      updatedCount++;
    }
    
    // Apply updates if any
    if (Object.keys(updates).length > 0) {
      batch.update(doc(db, "timetable", day), updates);
    }
  }
  
  return { batch, updatedCount, warnings };
}

async function createSummaryReport(results) {
  log("\n" + "=".repeat(60), colors.bright);
  log("MIGRATION SUMMARY REPORT", colors.bright + colors.cyan);
  log("=".repeat(60), colors.bright);
  
  let totalUpdated = 0;
  let totalWarnings = 0;
  
  for (const [collection, result] of Object.entries(results)) {
    if (result) {
      totalUpdated += result.updatedCount || 0;
      totalWarnings += result.warnings?.length || 0;
      
      log(`\n📁 ${collection.toUpperCase()}:`, colors.bright);
      log(`  📊 Records processed: ${result.total || 0}`);
      log(`  ✏️  Updates applied: ${result.updatedCount || 0}`);
      if (result.warnings && result.warnings.length > 0) {
        log(`  ⚠️  Warnings: ${result.warnings.length}`, colors.yellow);
        result.warnings.slice(0, 5).forEach(w => log(`    • ${w}`, colors.yellow));
        if (result.warnings.length > 5) {
          log(`    • ... and ${result.warnings.length - 5} more`, colors.yellow);
        }
      }
    }
  }
  
  log("\n" + "-".repeat(60));
  log(`📊 TOTAL UPDATES: ${totalUpdated}`, totalUpdated > 0 ? colors.green : colors.blue);
  log(`⚠️  TOTAL WARNINGS: ${totalWarnings}`, totalWarnings > 0 ? colors.yellow : colors.green);
  log("=".repeat(60), colors.bright);
}

async function migrateData() {
  log("\n" + "=".repeat(60), colors.bright);
  log("🚀 DATABASE MIGRATION SCRIPT", colors.bright + colors.cyan);
  log("=".repeat(60), colors.bright);
  log(`Started at: ${new Date().toLocaleString()}`);
  log("=".repeat(60) + "\n");

  const results = {};
  const batches = [];

  try {
    // Migrate users
    const usersResult = await migrateUsers();
    results.users = { 
      ...usersResult, 
      total: (await getDocs(collection(db, "users"))).size 
    };
    if (usersResult.batch) batches.push(usersResult.batch);

    // Migrate attendance
    const attendanceResult = await migrateAttendance();
    results.attendance = { 
      ...attendanceResult, 
      total: (await getDocs(collection(db, "attendance"))).size 
    };
    if (attendanceResult.batch) batches.push(attendanceResult.batch);

    // Migrate holidays
    const holidaysResult = await migrateHolidays();
    results.holidays = { 
      ...holidaysResult, 
      total: (await getDocs(collection(db, "holidays"))).size 
    };
    if (holidaysResult.batch) batches.push(holidaysResult.batch);

    // Migrate college settings
    const settingsResult = await migrateCollegeSettings();
    results.collegeSettings = { 
      ...settingsResult, 
      total: (await getDocs(collection(db, "collegeSettings"))).size 
    };
    if (settingsResult.batch) batches.push(settingsResult.batch);

    // Migrate audit logs
    const logsResult = await migrateAuditLogs();
    results.auditLogs = { 
      ...logsResult, 
      total: (await getDocs(collection(db, "auditLogs"))).size 
    };
    if (logsResult.batch) batches.push(logsResult.batch);

    // Migrate timetable
    const timetableResult = await migrateTimetable();
    results.timetable = { 
      ...timetableResult, 
      total: (await getDocs(collection(db, "timetable"))).size 
    };
    if (timetableResult.batch) batches.push(timetableResult.batch);

    // Commit all batches
    log("\n" + "-".repeat(60));
    logProgress("Committing all changes to Firestore...");
    
    let commitCount = 0;
    for (const batch of batches) {
      await batch.commit();
      commitCount++;
      logSuccess(`Committed batch ${commitCount}/${batches.length}`);
    }

    // Create summary report
    await createSummaryReport(results);

    log("\n" + "=".repeat(60));
    logSuccess("MIGRATION COMPLETED SUCCESSFULLY!");
    log("=".repeat(60));
    log(`Finished at: ${new Date().toLocaleString()}`);
    
    return { 
      success: true, 
      updatedCount: Object.values(results).reduce((sum, r) => sum + (r.updatedCount || 0), 0),
      warnings: Object.values(results).reduce((sum, r) => sum + (r.warnings?.length || 0), 0),
      results 
    };
    
  } catch (error) {
    logError(`Migration failed: ${error.message}`);
    console.error(error);
    
    log("\n" + "=".repeat(60));
    logError("MIGRATION FAILED!");
    log("=".repeat(60));
    
    return { 
      success: false, 
      error: error.message,
      stack: error.stack 
    };
  }
}

// Run the migration if this file is executed directly
if (require.main === module) {
  migrateData()
    .then(result => {
      if (result.success) {
        log("\n✨ Migration script finished successfully!", colors.green);
        process.exit(0);
      } else {
        log("\n💥 Migration script failed!", colors.red);
        process.exit(1);
      }
    })
    .catch(error => {
      logError(`Unexpected error: ${error.message}`);
      console.error(error);
      process.exit(1);
    });
}

// Export for use in other modules
module.exports = { migrateData };