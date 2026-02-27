import { runTransaction, doc } from 'firebase/firestore';
import { db } from '../services/firebase';

export const markAttendanceWithTransaction = async (userId, date, attendanceData) => {
  const attendanceRef = doc(db, 'attendance', `${userId}_${date}`);
  
  try {
    await runTransaction(db, async (transaction) => {
      const attendanceDoc = await transaction.get(attendanceRef);
      
      if (attendanceDoc.exists()) {
        // Update existing
        transaction.update(attendanceRef, {
          ...attendanceData,
          updatedAt: new Date()
        });
      } else {
        // Create new
        transaction.set(attendanceRef, {
          ...attendanceData,
          createdAt: new Date()
        });
      }
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};