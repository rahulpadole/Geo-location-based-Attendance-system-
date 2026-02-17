const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const auth = admin.auth();
const db = admin.firestore();

async function completeDatabaseSetup() {
  try {
    console.log("=".repeat(50));
    console.log("🔥 COMPLETE DATABASE SETUP FOR GEO ATTENDANCE SYSTEM");
    console.log("=".repeat(50));
    
    // Step 1: Clean existing data
    console.log("\n📌 STEP 1: Cleaning existing data...");
    await cleanupExistingData();
    
    // Step 2: Create Users
    console.log("\n📌 STEP 2: Creating Users...");
    await createUsers();
    
    // Step 3: Create College Settings
    console.log("\n📌 STEP 3: Creating College Settings...");
    await createCollegeSettings();
    
    // Step 4: Create Timetable
    console.log("\n📌 STEP 4: Creating Timetable...");
    await createTimetable();
    
    // Step 5: Create Holidays
    console.log("\n📌 STEP 5: Creating Holidays...");
    await createHolidays();
    
    // Step 6: Create Sample Attendance Records
    console.log("\n📌 STEP 6: Creating Sample Attendance Records...");
    await createSampleAttendance();
    
    // Step 7: Create Audit Logs
    console.log("\n📌 STEP 7: Creating Audit Logs...");
    await createAuditLogs();
    
    console.log("\n" + "=".repeat(50));
    console.log("✅✅✅ COMPLETE DATABASE SETUP FINISHED! ✅✅✅");
    console.log("=".repeat(50));
    console.log("\n📋 DEFAULT LOGIN CREDENTIALS:");
    console.log("-".repeat(40));
    console.log("ADMIN ACCOUNTS:");
    console.log("  1. Email: admin@geoattendance.com");
    console.log("     Password: Admin@123");
    console.log("     Name: System Administrator");
    console.log("\n  2. Email: superadmin@geoattendance.com");
    console.log("     Password: SuperAdmin@123");
    console.log("     Name: Super Admin");
    console.log("\nTEACHER ACCOUNTS:");
    console.log("  1. Email: john.teacher@geoattendance.com");
    console.log("     Password: Teacher@123");
    console.log("     Name: John Teacher (Computer Science)");
    console.log("\n  2. Email: jane.teacher@geoattendance.com");
    console.log("     Password: Teacher@123");
    console.log("     Name: Jane Smith (Information Technology)");
    console.log("\n  3. Email: bob.teacher@geoattendance.com");
    console.log("     Password: Teacher@123");
    console.log("     Name: Bob Johnson (Mechanical Engineering)");
    console.log("\n  4. Email: alice.teacher@geoattendance.com");
    console.log("     Password: Teacher@123");
    console.log("     Name: Alice Williams (Electrical Engineering)");
    console.log("\n  5. Email: charlie.teacher@geoattendance.com");
    console.log("     Password: Teacher@123");
    console.log("     Name: Charlie Brown (Civil Engineering)");
    console.log("-".repeat(40));
    console.log("\n⚠️  IMPORTANT: Change these passwords after first login!");
    console.log("=".repeat(50));

  } catch (error) {
    console.error("❌ Error in database setup:", error);
  } finally {
    process.exit();
  }
}

async function cleanupExistingData() {
  const collections = [
    'users', 
    'attendance', 
    'holidays', 
    'timetable', 
    'collegeSettings', 
    'auditLogs', 
    'activity_logs'
  ];
  
  for (const collectionName of collections) {
    try {
      const snapshot = await db.collection(collectionName).get();
      if (snapshot.size > 0) {
        const batch = db.batch();
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`   ✅ Deleted ${snapshot.size} documents from ${collectionName}`);
      } else {
        console.log(`   ⏩ No documents in ${collectionName}`);
      }
    } catch (error) {
      console.log(`   ❌ Error cleaning ${collectionName}:`, error.message);
    }
  }

  // Delete Auth users
  try {
    const users = await auth.listUsers();
    for (const user of users.users) {
      await auth.deleteUser(user.uid);
      console.log(`   ✅ Deleted Auth user: ${user.email}`);
    }
  } catch (error) {
    console.log("   ❌ Error deleting Auth users:", error.message);
  }
}

async function createUsers() {
  console.log("\n   👥 Creating Admin Users...");
  
  // Admin 1
  const admin1 = await createAuthUser(
    "admin-uid-001",
    "admin@geoattendance.com",
    "Admin@123",
    "System Administrator"
  );
  
  await createUserDocument(admin1.uid, {
    email: "admin@geoattendance.com",
    name: "System Administrator",
    adminId: "ADMIN001",
    designation: "Chief Administrator",
    department: "Administration",
    phone: "+91-9876543210",
    role: "admin",
    isActive: true,
    address: "Mumbai, India",
    joiningDate: "2024-01-01"
  });

  // Admin 2
  const admin2 = await createAuthUser(
    "admin-uid-002",
    "superadmin@geoattendance.com",
    "SuperAdmin@123",
    "Super Admin"
  );
  
  await createUserDocument(admin2.uid, {
    email: "superadmin@geoattendance.com",
    name: "Super Admin",
    adminId: "ADMIN002",
    designation: "Super Administrator",
    department: "Administration",
    phone: "+91-9876543211",
    role: "admin",
    isActive: true,
    address: "Delhi, India",
    joiningDate: "2024-01-01"
  });

  console.log("\n   👥 Creating Teacher Users...");

  // Teachers
  const teachers = [
    {
      uid: "teacher-uid-001",
      email: "john.teacher@geoattendance.com",
      name: "John Teacher",
      employeeId: "TCH001",
      department: "Computer Science",
      designation: "Professor",
      phone: "+91-9876543212",
      address: "Bangalore, India",
      specialization: "Artificial Intelligence"
    },
    {
      uid: "teacher-uid-002",
      email: "jane.teacher@geoattendance.com",
      name: "Jane Smith",
      employeeId: "TCH002",
      department: "Information Technology",
      designation: "Associate Professor",
      phone: "+91-9876543213",
      address: "Pune, India",
      specialization: "Cyber Security"
    },
    {
      uid: "teacher-uid-003",
      email: "bob.teacher@geoattendance.com",
      name: "Bob Johnson",
      employeeId: "TCH003",
      department: "Mechanical Engineering",
      designation: "Assistant Professor",
      phone: "+91-9876543214",
      address: "Chennai, India",
      specialization: "Thermodynamics"
    },
    {
      uid: "teacher-uid-004",
      email: "alice.teacher@geoattendance.com",
      name: "Alice Williams",
      employeeId: "TCH004",
      department: "Electrical Engineering",
      designation: "Professor",
      phone: "+91-9876543215",
      address: "Hyderabad, India",
      specialization: "Power Systems"
    },
    {
      uid: "teacher-uid-005",
      email: "charlie.teacher@geoattendance.com",
      name: "Charlie Brown",
      employeeId: "TCH005",
      department: "Civil Engineering",
      designation: "Assistant Professor",
      phone: "+91-9876543216",
      address: "Kolkata, India",
      specialization: "Structural Engineering"
    }
  ];

  for (const teacher of teachers) {
    const teacherUser = await createAuthUser(
      teacher.uid,
      teacher.email,
      "Teacher@123",
      teacher.name
    );
    
    await createUserDocument(teacherUser.uid, {
      email: teacher.email,
      name: teacher.name,
      employeeId: teacher.employeeId,
      department: teacher.department,
      designation: teacher.designation,
      phone: teacher.phone,
      role: "teacher",
      isActive: true,
      address: teacher.address,
      specialization: teacher.specialization,
      joiningDate: "2024-01-15",
      qualifications: ["Ph.D", "M.Tech"],
      experience: "10 years"
    });
  }
}

async function createAuthUser(uid, email, password, displayName) {
  try {
    return await auth.createUser({
      uid,
      email,
      password,
      displayName,
    });
  } catch (error) {
    if (error.code === 'auth/uid-already-exists' || error.code === 'auth/email-already-exists') {
      console.log(`   ⚠️ User ${email} already exists, fetching...`);
      return await auth.getUserByEmail(email);
    }
    throw error;
  }
}

async function createUserDocument(uid, userData) {
  await db.collection("users").doc(uid).set({
    ...userData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    uid: uid
  }, { merge: true });
  console.log(`   ✅ Created user: ${userData.name} (${userData.role})`);
}

async function createCollegeSettings() {
  const collegeData = {
    name: "Geo Attendance College",
    address: "123 Education Street, Tech City, India",
    latitude: 19.0760, // Mumbai coordinates as example
    longitude: 72.8777,
    radius: 150, // meters
    allowedDistance: 150,
    workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    weekendDays: ["Sunday"],
    established: "2000",
    contactEmail: "college@geoattendance.com",
    contactPhone: "+91-1234567890",
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  await db.collection("collegeSettings").doc("main").set(collegeData, { merge: true });
  console.log("   ✅ College settings created");
}

async function createTimetable() {
  const timetableData = {
    monday: {
      startTime: "09:00",
      lateAfter: "09:15",
      endTime: "17:00",
      workingHours: 8,
      breaks: [
        { start: "13:00", end: "14:00", name: "Lunch Break" }
      ]
    },
    tuesday: {
      startTime: "09:00",
      lateAfter: "09:15",
      endTime: "17:00",
      workingHours: 8,
      breaks: [
        { start: "13:00", end: "14:00", name: "Lunch Break" }
      ]
    },
    wednesday: {
      startTime: "09:00",
      lateAfter: "09:15",
      endTime: "17:00",
      workingHours: 8,
      breaks: [
        { start: "13:00", end: "14:00", name: "Lunch Break" }
      ]
    },
    thursday: {
      startTime: "09:00",
      lateAfter: "09:15",
      endTime: "17:00",
      workingHours: 8,
      breaks: [
        { start: "13:00", end: "14:00", name: "Lunch Break" }
      ]
    },
    friday: {
      startTime: "09:00",
      lateAfter: "09:15",
      endTime: "17:00",
      workingHours: 8,
      breaks: [
        { start: "13:00", end: "14:00", name: "Lunch Break" }
      ]
    },
    saturday: {
      startTime: "09:00",
      lateAfter: "09:15",
      endTime: "13:00",
      workingHours: 4,
      breaks: []
    },
    sunday: {
      startTime: null,
      lateAfter: null,
      endTime: null,
      workingHours: 0,
      breaks: [],
      isHoliday: true
    }
  };

  for (const [day, data] of Object.entries(timetableData)) {
    await db.collection("timetable").doc(day).set(data, { merge: true });
  }
  console.log("   ✅ Timetable created for all days");
}

async function createHolidays() {
  const currentYear = new Date().getFullYear();
  const holidays = [
    {
      name: "Republic Day",
      date: `${currentYear}-01-26`,
      type: "national",
      description: "Republic Day of India",
      isPaidHoliday: true
    },
    {
      name: "Holi",
      date: `${currentYear}-03-25`,
      type: "festival",
      description: "Festival of Colors",
      isPaidHoliday: true
    },
    {
      name: "Independence Day",
      date: `${currentYear}-08-15`,
      type: "national",
      description: "Independence Day of India",
      isPaidHoliday: true
    },
    {
      name: "Gandhi Jayanti",
      date: `${currentYear}-10-02`,
      type: "national",
      description: "Birthday of Mahatma Gandhi",
      isPaidHoliday: true
    },
    {
      name: "Diwali",
      date: `${currentYear}-11-12`,
      type: "festival",
      description: "Festival of Lights",
      isPaidHoliday: true
    },
    {
      name: "Christmas",
      date: `${currentYear}-12-25`,
      type: "festival",
      description: "Christmas Day",
      isPaidHoliday: true
    },
    {
      name: "New Year's Day",
      date: `${currentYear + 1}-01-01`,
      type: "observance",
      description: "New Year's Day",
      isPaidHoliday: true
    }
  ];

  for (const holiday of holidays) {
    await db.collection("holidays").add({
      ...holiday,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "system"
    });
  }
  console.log("   ✅ Holidays created");
}

async function createSampleAttendance() {
  const teachers = [
    { uid: "teacher-uid-001", name: "John Teacher", dept: "Computer Science" },
    { uid: "teacher-uid-002", name: "Jane Smith", dept: "Information Technology" },
    { uid: "teacher-uid-003", name: "Bob Johnson", dept: "Mechanical Engineering" }
  ];

  const today = new Date();
  const attendanceRecords = [];

  // Create attendance for last 30 days
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    // Skip Sundays
    if (date.getDay() === 0) continue;

    for (const teacher of teachers) {
      // Random attendance pattern
      const rand = Math.random();
      let status, inTime, outTime, lateReason;
      
      if (rand < 0.7) { // 70% present
        status = "Present";
        inTime = new Date(date.setHours(9, Math.floor(Math.random() * 15), 0));
        outTime = new Date(date.setHours(17, Math.floor(Math.random() * 30), 0));
        lateReason = null;
      } else if (rand < 0.85) { // 15% late
        status = "Late";
        inTime = new Date(date.setHours(9, 30 + Math.floor(Math.random() * 30), 0));
        outTime = new Date(date.setHours(17, Math.floor(Math.random() * 30), 0));
        lateReason = "Traffic";
      } else { // 15% absent
        status = "Absent";
        inTime = null;
        outTime = null;
        lateReason = null;
      }

      const docId = `${teacher.uid}_${dateStr}`;
      const record = {
        userId: teacher.uid,
        userName: teacher.name,
        department: teacher.dept,
        date: dateStr,
        status: status,
        inTime: inTime ? admin.firestore.Timestamp.fromDate(inTime) : null,
        outTime: outTime ? admin.firestore.Timestamp.fromDate(outTime) : null,
        lateReason: lateReason,
        inLocation: status !== "Absent" ? {
          distance: Math.random() * 100,
          accuracy: 5,
          lat: 19.0760 + (Math.random() - 0.5) * 0.01,
          lng: 72.8777 + (Math.random() - 0.5) * 0.01
        } : null,
        createdAt: admin.firestore.Timestamp.fromDate(date),
        updatedAt: admin.firestore.Timestamp.now()
      };

      attendanceRecords.push({ docId, record });
    }
  }

  // Batch write attendance records
  let batch = db.batch();
  let count = 0;

  for (const record of attendanceRecords) {
    batch.set(db.collection("attendance").doc(record.docId), record.record, { merge: true });
    count++;
    
    if (count % 500 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`   ✅ Created ${count} attendance records`);
    }
  }

  if (count % 500 !== 0) {
    await batch.commit();
  }
  
  console.log(`   ✅ Created ${count} sample attendance records`);
}

async function createAuditLogs() {
  const actions = [
    "User Login",
    "Attendance Marked",
    "Profile Updated",
    "Password Changed",
    "Settings Modified",
    "Teacher Added",
    "Holiday Added",
    "Timetable Updated"
  ];

  const admins = ["admin-uid-001", "admin-uid-002"];
  
  // Create audit logs for last 7 days
  for (let i = 0; i < 50; i++) {
    const date = new Date();
    date.setHours(date.getHours() - i * 3);
    
    const log = {
      adminId: admins[Math.floor(Math.random() * admins.length)],
      action: actions[Math.floor(Math.random() * actions.length)],
      details: {
        ip: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: "Mozilla/5.0",
        timestamp: date.toISOString()
      },
      timestamp: admin.firestore.Timestamp.fromDate(date)
    };

    await db.collection("auditLogs").add(log);
  }

  console.log("   ✅ Audit logs created");
}

// Run the complete setup
completeDatabaseSetup();