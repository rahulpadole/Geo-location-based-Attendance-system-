import { db } from "../services/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

/**
 * Log an admin action to the activity_logs collection.
 * @param {string} adminName - Name of the admin performing the action
 * @param {string} action - Description of the action (e.g., "Added Teacher")
 * @param {string} target - Target of the action (e.g., Teacher name or ID)
 */
export const logAdminAction = async (adminName, action, target = "") => {
  try {
    await addDoc(collection(db, "activity_logs"), {
      adminName,
      action,
      target,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to log admin action:", err);
  }
};
