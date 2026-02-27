import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../services/firebase";

/**
 * Log admin actions to Firestore
 * @param {string} adminId - Admin user ID
 * @param {string} action - Action performed
 * @param {string} target - Target of the action
 */
export const logAdminAction = async (adminId, action, target) => {
  try {
    await addDoc(collection(db, "auditLogs"), {
      adminId,
      action,
      target,
      timestamp: serverTimestamp(),
      details: {
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    });
    console.log(`Logged: ${action} - ${target}`);
  } catch (error) {
    console.error("Failed to log admin action:", error);
  }
};