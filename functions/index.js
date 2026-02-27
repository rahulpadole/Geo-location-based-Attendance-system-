const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// ================= DELETE USER FROM AUTHENTICATION =================
/**
 * Cloud Function to delete a user from Firebase Authentication
 * Call this from your admin panel when deleting a teacher
 */
exports.deleteUserAuth = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated", 
      "You must be logged in to delete users"
    );
  }

  const callerUid = context.auth.uid;
  
  try {
    // Check if caller is an admin
    const callerDoc = await db.collection("users").doc(callerUid).get();
    
    if (!callerDoc.exists) {
      throw new functions.https.HttpsError(
        "permission-denied", 
        "Your user record not found"
      );
    }

    const callerData = callerDoc.data();
    
    // Verify caller has admin role
    if (callerData.role !== "admin") {
      throw new functions.https.HttpsError(
        "permission-denied", 
        "Only administrators can delete users"
      );
    }

    // Get the UID of user to delete from request data
    const { uid } = data;
    
    if (!uid) {
      throw new functions.https.HttpsError(
        "invalid-argument", 
        "User UID is required"
      );
    }

    console.log(`Admin ${callerUid} is deleting user ${uid}`);

    // Delete user from Firebase Authentication
    await admin.auth().deleteUser(uid);
    
    // Also delete user document from Firestore (if not already deleted)
    try {
      await db.collection("users").doc(uid).delete();
      console.log(`Firestore document for ${uid} deleted`);
    } catch (firestoreError) {
      console.log(`Firestore document for ${uid} may already be deleted:`, firestoreError.message);
      // Continue even if Firestore delete fails - Auth delete is the main goal
    }

    // Log the action
    await db.collection("auditLogs").add({
      action: "USER_DELETED",
      adminId: callerUid,
      adminEmail: callerData.email,
      targetUserId: uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        method: "cloud_function",
        success: true
      }
    });

    return { 
      success: true, 
      message: "User successfully deleted from Authentication" 
    };

  } catch (error) {
    console.error("Error deleting user:", error);
    
    // Handle specific Firebase Auth errors
    if (error.code === 'auth/user-not-found') {
      throw new functions.https.HttpsError(
        "not-found", 
        "User not found in Authentication"
      );
    }
    
    // Log the error
    await db.collection("auditLogs").add({
      action: "USER_DELETION_FAILED",
      adminId: context.auth.uid,
      targetUserId: data.uid,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      details: {
        error: error.message,
        code: error.code
      }
    });

    throw new functions.https.HttpsError(
      "internal", 
      `Failed to delete user: ${error.message}`
    );
  }
});

// ================= DELETE MULTIPLE USERS (BATCH) =================
/**
 * Cloud Function to delete multiple users at once
 * Useful for bulk operations
 */
exports.deleteMultipleUsersAuth = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const callerUid = context.auth.uid;
  
  // Verify admin status
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin access required");
  }

  const { uids } = data;
  
  if (!uids || !Array.isArray(uids) || uids.length === 0) {
    throw new functions.https.HttpsError("invalid-argument", "Array of UIDs required");
  }

  const results = {
    success: [],
    failed: []
  };

  // Delete users one by one (Firebase Auth doesn't support batch delete)
  for (const uid of uids) {
    try {
      await admin.auth().deleteUser(uid);
      results.success.push(uid);
      
      // Try to delete Firestore document
      try {
        await db.collection("users").doc(uid).delete();
      } catch (e) {
        // Ignore Firestore errors
      }
    } catch (error) {
      results.failed.push({ uid, error: error.message });
    }
  }

  // Log the bulk operation
  await db.collection("auditLogs").add({
    action: "BULK_USER_DELETION",
    adminId: callerUid,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    details: results
  });

  return results;
});

// ================= GET USER AUTH DATA =================
/**
 * Cloud Function to get user authentication data
 * Useful for admin panel to see user details
 */
exports.getUserAuthData = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const callerUid = context.auth.uid;
  
  // Verify admin status
  const callerDoc = await db.collection("users").doc(callerUid).get();
  if (!callerDoc.exists || callerDoc.data().role !== "admin") {
    throw new functions.https.HttpsError("permission-denied", "Admin access required");
  }

  const { uid } = data;
  
  if (!uid) {
    throw new functions.https.HttpsError("invalid-argument", "User UID required");
  }

  try {
    const userRecord = await admin.auth().getUser(uid);
    
    return {
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        phoneNumber: userRecord.phoneNumber,
        disabled: userRecord.disabled,
        creationTime: userRecord.metadata.creationTime,
        lastSignInTime: userRecord.metadata.lastSignInTime,
        providerData: userRecord.providerData
      }
    };
  } catch (error) {
    throw new functions.https.HttpsError("not-found", "User not found in Authentication");
  }
});

// ================= YOUR EXISTING FUNCTIONS =================
// (Keep all your existing functions below)

// ================= DELETE OLD ATTENDANCE =================
exports.deleteOldAttendance = functions.pubsub
  .schedule("every 24 hours")
  .timeZone("Asia/Kolkata")
  .onRun(async () => {
    const now = new Date();
    const cutoff = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() - 40
    );

    const cutoffDate = cutoff.toISOString().split("T")[0];

    const snapshot = await db
      .collection("attendance")
      .where("date", "<", cutoffDate)
      .get();

    if (snapshot.empty) return null;

    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();

    console.log(`Deleted ${snapshot.size} old attendance records`);
    return null;
  });

// ================= SECURE MARK ATTENDANCE =================
exports.markAttendance = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "Login required");
  }

  const uid = context.auth.uid;
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const docId = `${uid}_${today}`;
  const attRef = db.collection("attendance").doc(docId);

  // SETTINGS
  const settingsSnap = await db.collection("collegeSettings").doc("main").get();
  const settings = settingsSnap.data();

  // SUNDAY BLOCK
  const day = now.getDay();
  const specialWorking = await db.collection("specialWorkingDays").doc(today).get();

  if (day === 0 && !specialWorking.exists) {
    throw new functions.https.HttpsError("failed-precondition", "Sunday blocked");
  }

  // HOLIDAY BLOCK
  const holiday = await db.collection("holidays").doc(today).get();
  if (holiday.exists) {
    throw new functions.https.HttpsError("failed-precondition", "Holiday blocked");
  }

  // CHECK EXISTING
  const attSnap = await attRef.get();

  const lateTime = new Date();
  lateTime.setHours(9, 40, 0, 0);

  const isLate = now > lateTime;
  const lateMinutes = isLate ? Math.floor((now - lateTime) / 60000) : 0;

  // ===== CREATE IN =====
  if (!attSnap.exists) {
    await attRef.set({
      userId: uid,
      date: today,
      inTime: admin.firestore.FieldValue.serverTimestamp(),
      status: isLate ? "Late" : "Present",
      late: isLate,
      lateMinutes,
      deviceId: data.deviceId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { message: "IN marked successfully" };
  }

  const attendance = attSnap.data();

  // ===== MULTIPLE DEVICE BLOCK =====
  if (attendance.deviceId !== data.deviceId) {
    throw new functions.https.HttpsError(
      "permission-denied",
      "Already marked from another device"
    );
  }

  // ===== ADD OUT =====
  if (!attendance.outTime) {
    await attRef.update({
      outTime: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return { message: "OUT marked successfully" };
  }

  throw new functions.https.HttpsError("already-exists", "Attendance completed");
});