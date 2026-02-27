import { db, auth } from "../services/firebase";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";

// Store credentials securely (in production, use environment variables)
// These will be displayed ONCE and then you should change them
const ADMIN_EMAIL = "admin@geoattendance.com";
const TEACHER_EMAIL = "teacher@geoattendance.com";
// Passwords are NOT stored in code - they are generated

const generateTempPassword = () => {
  return Math.random().toString(36).slice(-8) + 
         Math.random().toString(36).toUpperCase().slice(-2) + 
         "!1";
};

export const initializeDatabase = async () => {
  console.log("🚀 Starting database initialization...");

  try {
    // Check if any users exist
    const usersQuery = query(collection(db, "users"), where("role", "==", "admin"));
    const existingAdmins = await getDocs(usersQuery);

    if (!existingAdmins.empty) {
      console.log("✅ Database already initialized");
      return { 
        success: true, 
        message: "Database already initialized" 
      };
    }

    console.log("📝 Creating default admin user...");
    
    // Generate temporary passwords
    const adminPassword = generateTempPassword();
    const teacherPassword = generateTempPassword();
    
    // Create admin in Firebase Auth
    const adminCredential = await createUserWithEmailAndPassword(
      auth,
      ADMIN_EMAIL,
      adminPassword
    );

    // Create admin document in Firestore (NO PASSWORD STORED)
    await setDoc(doc(db, "users", adminCredential.user.uid), {
      email: ADMIN_EMAIL,
      name: "System Administrator",
      adminId: "ADMIN001",
      designation: "Chief Administrator",
      department: "Administration",
      phone: "+1234567890",
      role: "admin",
      isActive: true,
      createdAt: new Date(),
      uid: adminCredential.user.uid,
      passwordLastChanged: new Date(),
      requirePasswordChange: true, // Force password change on first login
      createdBy: "system"
    });

    console.log("✅ Admin created successfully");
    console.log("📝 Creating default teacher user...");
    
    // Create teacher in Firebase Auth
    const teacherCredential = await createUserWithEmailAndPassword(
      auth,
      TEACHER_EMAIL,
      teacherPassword
    );

    // Create teacher document in Firestore
    await setDoc(doc(db, "users", teacherCredential.user.uid), {
      email: TEACHER_EMAIL,
      name: "John Teacher",
      employeeId: "TCH001",
      department: "Computer Science",
      designation: "Senior Lecturer",
      phone: "+1234567891",
      role: "teacher",
      isActive: true,
      joiningDate: new Date().toISOString().split('T')[0],
      createdAt: new Date(),
      uid: teacherCredential.user.uid,
      passwordLastChanged: new Date(),
      requirePasswordChange: true,
      createdBy: "system"
    });

    // Create college settings
    await setDoc(doc(db, "collegeSettings", "main"), {
      latitude: 0,
      longitude: 0,
      radius: 150,
      updatedAt: new Date(),
      updatedBy: "system"
    });

    // Create timetable
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    for (const day of days) {
      await setDoc(doc(db, "timetable", day), {
        startTime: '09:00',
        lateAfter: '09:15',
        endTime: day === 'saturday' ? '13:00' : '17:00',
        updatedAt: new Date(),
        updatedBy: "system"
      });
    }

    // Log the initialization
    await setDoc(doc(db, "auditLogs", `init_${Date.now()}`), {
      action: "DATABASE_INITIALIZED",
      timestamp: new Date(),
      details: {
        adminEmail: ADMIN_EMAIL,
        teacherEmail: TEACHER_EMAIL
      }
    });

    // DON'T log passwords - instead, show them ONCE in console
    console.log("\n" + "=".repeat(50));
    console.log("🎉 DATABASE INITIALIZATION COMPLETE!");
    console.log("=".repeat(50));
    console.log("\n📝 TEMPORARY CREDENTIALS (CHANGE IMMEDIATELY):");
    console.log("-".repeat(30));
    console.log(`ADMIN:
  Email: ${ADMIN_EMAIL}
  Password: ${adminPassword}
  (Copy this password now - it won't be shown again)`);
    console.log(`\nTEACHER:
  Email: ${TEACHER_EMAIL}
  Password: ${teacherPassword}
  (Copy this password now - it won't be shown again)`);
    console.log("\n" + "=".repeat(50));
    console.log("⚠️  IMPORTANT: Change these passwords on first login!");
    console.log("=".repeat(50));

    // In production, you would email these credentials instead
    // await sendCredentialsEmail(ADMIN_EMAIL, adminPassword, TEACHER_EMAIL, teacherPassword);

    return {
      success: true,
      message: "Database initialized successfully. Check console for temporary credentials.",
      credentials: {
        admin: { email: ADMIN_EMAIL },
        teacher: { email: TEACHER_EMAIL }
      } // DON'T return passwords
    };

  } catch (error) {
    console.error("❌ Error initializing database:", error);
    return {
      success: false,
      error: error.message
    };
  }
};

export default initializeDatabase;