const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();


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
