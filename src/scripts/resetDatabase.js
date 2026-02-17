import { db, auth } from "../services/firebase";
import { 
  collection, 
  getDocs, 
  deleteDoc, 
  doc, 
  setDoc,
  writeBatch 
} from "firebase/firestore";
import { deleteUser } from "firebase/auth";

// Default admin credentials
const DEFAULT_ADMIN = {
  email: "admin@geoattendance.com",
  password: "admin123",
  name: "System Administrator",
  adminId: "ADMIN001",
  designation: "Chief Administrator",
  department: "Administration",
  phone: "+1234567890",
  role: "admin",
  isActive: true
};

// Default teacher credentials
const DEFAULT_TEACHER = {
  email: "teacher@geoattendance.com",
  password: "teacher123",
  name: "John Teacher",
  employeeId: "TCH001",
  department: "Computer Science",
  designation: "Senior Lecturer",
  phone: "+1234567891",
  role: "teacher",
  isActive: true,
  joiningDate: new Date().toISOString().split('T')[0]
};

// Default college settings
const DEFAULT_COLLEGE_SETTINGS = {
  latitude: 0, // Will be updated when admin sets it
  longitude: 0,
  radius: 150,
  updatedAt: new Date()
};

// Default timetable
const DEFAULT_TIMETABLE = {
  monday: { startTime: "09:00", lateAfter: "09:15", endTime: "17:00" },
  tuesday: { startTime: "09:00", lateAfter: "09:15", endTime: "17:00" },
  wednesday: { startTime: "09:00", lateAfter: "09:15", endTime: "17:00" },
  thursday: { startTime: "09:00", lateAfter: "09:15", endTime: "17:00" },
  friday: { startTime: "09:00", lateAfter: "09:15", endTime: "17:00" },
  saturday: { startTime: "09:00", lateAfter: "09:15", endTime: "13:00" }
};

// Default holidays
const DEFAULT_HOLIDAYS = [
  {
    name: "New Year's Day",
    date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    type: "holiday",
    description: "New Year Holiday"
  },
  {
    name: "Independence Day",
    date: new Date(new Date().getFullYear(), 7, 15).toISOString().split('T')[0],
    type: "holiday",
    description: "Independence Day"
  },
  {
    name: "Christmas",
    date: new Date(new Date().getFullYear(), 11, 25).toISOString().split('T')[0],
    type: "holiday",
    description: "Christmas Day"
  }
];

export const resetDatabase = async () => {
  console.log("⚠️ WARNING: This will delete ALL existing data!");
  console.log("Press OK to continue or Cancel to abort.");
  
  if (!window.confirm("Are you sure you want to reset the database? This action cannot be undone!")) {
    return;
  }

  try {
    console.log("🔄 Starting database reset...");
    
    // Collections to clear
    const collections = [
      'users',
      'attendance',
      'holidays',
      'timetable',
      'collegeSettings',
      'auditLogs',
      'activity_logs'
    ];

    // Clear all collections
    for (const collectionName of collections) {
      console.log(`Clearing ${collectionName}...`);
      const snapshot = await getDocs(collection(db, collectionName));
      const batch = writeBatch(db);
      
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log(`✅ Cleared ${snapshot.size} documents from ${collectionName}`);
    }

    console.log("✅ All collections cleared successfully");

    // Create default admin user
    console.log("Creating default admin user...");
    // Note: In a real scenario, you'd create this through Firebase Auth
    // For now, we'll just create the Firestore document
    const adminId = "admin_default_" + Date.now();
    await setDoc(doc(db, "users", adminId), {
      ...DEFAULT_ADMIN,
      createdAt: new Date(),
      uid: adminId
    });
    console.log("✅ Default admin created");

    // Create default teacher user
    console.log("Creating default teacher user...");
    const teacherId = "teacher_default_" + Date.now();
    await setDoc(doc(db, "users", teacherId), {
      ...DEFAULT_TEACHER,
      createdAt: new Date(),
      uid: teacherId
    });
    console.log("✅ Default teacher created");

    // Create default college settings
    console.log("Creating default college settings...");
    await setDoc(doc(db, "collegeSettings", "main"), DEFAULT_COLLEGE_SETTINGS);
    console.log("✅ Default college settings created");

    // Create default timetable
    console.log("Creating default timetable...");
    for (const [day, times] of Object.entries(DEFAULT_TIMETABLE)) {
      await setDoc(doc(db, "timetable", day), times);
    }
    console.log("✅ Default timetable created");

    // Create default holidays
    console.log("Creating default holidays...");
    for (const holiday of DEFAULT_HOLIDAYS) {
      await setDoc(doc(db, "holidays", `holiday_${Date.now()}_${Math.random()}`), {
        ...holiday,
        createdAt: new Date()
      });
    }
    console.log("✅ Default holidays created");

    console.log("\n🎉 Database reset complete!");
    console.log("\n📝 Default Credentials:");
    console.log("----------------------");
    console.log("ADMIN:");
    console.log(`  Email: ${DEFAULT_ADMIN.email}`);
    console.log(`  Password: ${DEFAULT_ADMIN.password}`);
    console.log(`  Name: ${DEFAULT_ADMIN.name}`);
    console.log("\nTEACHER:");
    console.log(`  Email: ${DEFAULT_TEACHER.email}`);
    console.log(`  Password: ${DEFAULT_TEACHER.password}`);
    console.log(`  Name: ${DEFAULT_TEACHER.name}`);
    console.log("\n⚠️ IMPORTANT: Change these passwords after first login!");

    return {
      success: true,
      message: "Database reset successfully",
      admin: DEFAULT_ADMIN,
      teacher: DEFAULT_TEACHER
    };

  } catch (error) {
    console.error("❌ Error resetting database:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Export the function to use in your app
export default resetDatabase;