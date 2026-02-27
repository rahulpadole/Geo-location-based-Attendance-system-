import { collection, query, where, getDocs, writeBatch, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { COLLECTIONS } from '../constants';

export const syncUserNameInAttendance = async (userId, newName) => {
  const batch = writeBatch(db);
  
  try {
    // Find all attendance records for this user
    const q = query(
      collection(db, COLLECTIONS.ATTENDANCE),
      where('userId', '==', userId)
    );
    
    const snapshot = await getDocs(q);
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { userName: newName });
    });
    
    await batch.commit();
    console.log(`Updated ${snapshot.size} attendance records with new name`);
    
    return { success: true, count: snapshot.size };
  } catch (error) {
    console.error('Error syncing user name:', error);
    throw error;
  }
};