import { 
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc, 
  setDoc, 
  updateDoc,
  deleteDoc, // This is imported but we need to use it or remove it
  orderBy,
  limit,
  startAfter,
  Timestamp 
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTIONS, ATTENDANCE_STATUS, DEFAULTS } from '../constants';

class AttendanceService {
  /**
   * Get today's attendance for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object|null>} Attendance record or null
   */
  async getTodayAttendance(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('userId', '==', userId),
        where('date', '==', today)
      );
      
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error fetching today attendance:', error);
      throw new Error('Failed to fetch today\'s attendance');
    }
  }

  /**
   * Mark attendance (check-in or check-out)
   * @param {string} userId - User ID
   * @param {Object} userData - User data
   * @param {Object} attendanceData - Attendance data
   * @returns {Promise<Object>} Result with success status and ID
   */
  async markAttendance(userId, userData, attendanceData) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const docId = `${userId}_${today}`;
      const docRef = doc(db, COLLECTIONS.ATTENDANCE, docId);
      
      // Validate required fields
      if (!attendanceData.status) {
        throw new Error('Attendance status is required');
      }
      
      if (attendanceData.status === ATTENDANCE_STATUS.LATE && !attendanceData.lateReason) {
        throw new Error('Late reason is required');
      }

      const existing = await getDoc(docRef);
      const now = Timestamp.now();
      
      if (existing.exists()) {
        // Update existing (check-out)
        await updateDoc(docRef, {
          outTime: attendanceData.outTime || now,
          outLocation: attendanceData.outLocation || null,
          updatedAt: now
        });
      } else {
        // Create new (check-in)
        await setDoc(docRef, {
          userId,
          userName: userData.name || userData.email || 'Unknown',
          date: today,
          inTime: now,
          status: attendanceData.status || 'Present',
          lateReason: attendanceData.lateReason || '',
          inLocation: attendanceData.inLocation || null,
          createdAt: now,
          ...attendanceData
        });
      }
      
      return { success: true, id: docId };
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw error;
    }
  }

  /**
   * Get paginated attendance history (requires index)
   * @param {string} userId - User ID
   * @param {number} page - Page number (1-based)
   * @param {number} pageSize - Items per page
   * @returns {Promise<Object>} Paginated attendance records
   */
  async getAttendanceHistory(userId, page = 1, pageSize = DEFAULTS.PAGINATION_LIMIT) {
    try {
      console.log(`Fetching history for user ${userId}, page ${page}, pageSize ${pageSize}`);
      
      // First, get total count
      const countQuery = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('userId', '==', userId)
      );
      
      const countSnapshot = await getDocs(countQuery);
      const total = countSnapshot.size;
      const totalPages = Math.ceil(total / pageSize);
      
      console.log(`Total records: ${total}, Total pages: ${totalPages}`);

      // If no records, return empty array
      if (total === 0) {
        return {
          records: [],
          total: 0,
          page: 1,
          pageSize,
          totalPages: 0
        };
      }

      // Build the main query with ordering (REQUIRES INDEX)
      let q = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('userId', '==', userId),
        orderBy('date', 'desc')
      );

      // Apply pagination
      if (page > 1) {
        // Get the last document of the previous page
        const previousPageQuery = query(
          collection(db, COLLECTIONS.ATTENDANCE),
          where('userId', '==', userId),
          orderBy('date', 'desc'),
          limit((page - 1) * pageSize)
        );
        
        const previousSnapshot = await getDocs(previousPageQuery);
        const lastVisible = previousSnapshot.docs[previousSnapshot.docs.length - 1];
        
        if (lastVisible) {
          q = query(
            collection(db, COLLECTIONS.ATTENDANCE),
            where('userId', '==', userId),
            orderBy('date', 'desc'),
            startAfter(lastVisible),
            limit(pageSize)
          );
        } else {
          q = query(
            collection(db, COLLECTIONS.ATTENDANCE),
            where('userId', '==', userId),
            orderBy('date', 'desc'),
            limit(pageSize)
          );
        }
      } else {
        q = query(
          collection(db, COLLECTIONS.ATTENDANCE),
          where('userId', '==', userId),
          orderBy('date', 'desc'),
          limit(pageSize)
        );
      }

      const snapshot = await getDocs(q);
      
      const records = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          inTime: data.inTime || null,
          outTime: data.outTime || null,
          date: data.date || '',
          status: data.status || 'Present',
          lateReason: data.lateReason || ''
        };
      });

      console.log(`Fetched ${records.length} records for page ${page}`);

      return {
        records,
        total,
        page,
        pageSize,
        totalPages
      };
      
    } catch (error) {
      console.error('Error in getAttendanceHistory:', error);
      
      // Check if error is due to missing index
      if (error.message.includes('index') || error.code === 'failed-precondition') {
        throw new Error('INDEX_REQUIRED');
      }
      
      throw new Error(`Failed to fetch attendance history: ${error.message}`);
    }
  }

  /**
   * Simple attendance history query (NO INDEX REQUIRED)
   * Use this as fallback when index is missing
   * @param {string} userId - User ID
   * @returns {Promise<Object>} All attendance records (unsorted)
   */
  async getAttendanceHistorySimple(userId) {
    try {
      console.log(`Fetching simple history for user ${userId} (no index required)`);
      
      // Simple query without orderBy - NO INDEX NEEDED
      const q = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      
      // Sort in memory (works for small to medium datasets)
      const records = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            inTime: data.inTime || null,
            outTime: data.outTime || null,
            date: data.date || '',
            status: data.status || 'Present',
            lateReason: data.lateReason || ''
          };
        })
        .sort((a, b) => {
          // Sort by date descending (newest first)
          if (!a.date) return 1;
          if (!b.date) return -1;
          return b.date.localeCompare(a.date);
        });

      console.log(`Simple query found ${records.length} records`);

      return {
        records,
        total: records.length,
        page: 1,
        pageSize: records.length,
        totalPages: 1
      };
      
    } catch (error) {
      console.error('Error in getAttendanceHistorySimple:', error);
      throw new Error(`Failed to fetch attendance history: ${error.message}`);
    }
  }

  /**
   * Get attendance history with automatic fallback
   * @param {string} userId - User ID
   * @param {number} page - Page number
   * @param {number} pageSize - Items per page
   * @returns {Promise<Object>} Attendance records
   */
  async getAttendanceHistoryWithFallback(userId, page = 1, pageSize = DEFAULTS.PAGINATION_LIMIT) {
    try {
      // Try indexed query first
      return await this.getAttendanceHistory(userId, page, pageSize);
    } catch (error) {
      if (error.message === 'INDEX_REQUIRED' || error.message.includes('index')) {
        console.log('Index missing, using simple query fallback');
        // Fallback to simple query
        return await this.getAttendanceHistorySimple(userId);
      }
      throw error;
    }
  }

  /**
   * Get attendance by date range
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @param {Object} filters - Additional filters
   * @param {number} page - Page number
   * @param {number} pageSize - Items per page
   * @returns {Promise<Object>} Paginated attendance records
   */
  async getAttendanceByDateRange(startDate, endDate, filters = {}, page = 1, pageSize = DEFAULTS.PAGINATION_LIMIT) {
    try {
      let constraints = [
        where('date', '>=', startDate),
        where('date', '<=', endDate),
        orderBy('date', 'desc')
      ];

      if (filters.status) {
        constraints.push(where('status', '==', filters.status));
      }

      if (filters.department) {
        constraints.push(where('department', '==', filters.department));
      }

      if (filters.userId) {
        constraints.push(where('userId', '==', filters.userId));
      }

      const baseQuery = query(collection(db, COLLECTIONS.ATTENDANCE), ...constraints);
      
      // Get total count
      const countSnapshot = await getDocs(baseQuery);
      const total = countSnapshot.size;

      // Apply pagination
      const paginatedQuery = query(baseQuery, limit(pageSize));
      const snapshot = await getDocs(paginatedQuery);
      
      const records = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return {
        records,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
      };
    } catch (error) {
      console.error('Error fetching attendance by date range:', error);
      
      // Fallback for missing index
      if (error.message.includes('index')) {
        // Simple fallback without filters
        const simpleQuery = query(
          collection(db, COLLECTIONS.ATTENDANCE)
        );
        const snapshot = await getDocs(simpleQuery);
        
        let records = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(record => 
            record.date >= startDate && 
            record.date <= endDate &&
            (!filters.status || record.status === filters.status) &&
            (!filters.userId || record.userId === filters.userId)
          )
          .sort((a, b) => b.date.localeCompare(a.date));

        return {
          records,
          total: records.length,
          page: 1,
          pageSize: records.length,
          totalPages: 1
        };
      }
      
      throw new Error('Failed to fetch attendance records');
    }
  }

  /**
   * Get attendance statistics
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Object>} Attendance statistics
   */
  async getAttendanceStats(startDate, endDate) {
    try {
      const result = await this.getAttendanceByDateRange(startDate, endDate, {});
      
      const stats = {
        total: result.total,
        present: 0,
        late: 0,
        absent: 0,
        halfDay: 0,
        leave: 0,
        byDepartment: {}
      };

      result.records.forEach(record => {
        // Count by status
        switch (record.status) {
          case ATTENDANCE_STATUS.PRESENT:
            stats.present++;
            break;
          case ATTENDANCE_STATUS.LATE:
            stats.late++;
            break;
          case ATTENDANCE_STATUS.ABSENT:
            stats.absent++;
            break;
          case ATTENDANCE_STATUS.HALF_DAY:
            stats.halfDay++;
            break;
          case ATTENDANCE_STATUS.LEAVE:
            stats.leave++;
            break;
          default:
            break;
        }

        // Count by department
        const dept = record.department || 'Unknown';
        if (!stats.byDepartment[dept]) {
          stats.byDepartment[dept] = { total: 0, present: 0, late: 0, absent: 0 };
        }
        stats.byDepartment[dept].total++;
        if (record.status === ATTENDANCE_STATUS.PRESENT) stats.byDepartment[dept].present++;
        else if (record.status === ATTENDANCE_STATUS.LATE) stats.byDepartment[dept].late++;
        else if (record.status === ATTENDANCE_STATUS.ABSENT) stats.byDepartment[dept].absent++;
      });

      return stats;
    } catch (error) {
      console.error('Error calculating attendance stats:', error);
      throw new Error('Failed to calculate attendance statistics');
    }
  }

  /**
   * Check if a user has marked attendance today
   * @param {string} userId - User ID
   * @returns {Promise<boolean>} True if attendance marked
   */
  async hasMarkedToday(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      const q = query(
        collection(db, COLLECTIONS.ATTENDANCE),
        where('userId', '==', userId),
        where('date', '==', today)
      );
      
      const snapshot = await getDocs(q);
      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking today attendance:', error);
      return false;
    }
  }

  /**
   * Get recent attendance for a user
   * @param {string} userId - User ID
   * @param {number} days - Number of days to look back
   * @returns {Promise<Array>} Recent attendance records
   */
  async getRecentAttendance(userId, days = 7) {
    try {
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      const result = await this.getAttendanceByDateRange(startDate, endDate, { userId });
      return result.records;
    } catch (error) {
      console.error('Error fetching recent attendance:', error);
      return [];
    }
  }

  /**
   * Update an attendance record (admin only)
   * @param {string} attendanceId - Attendance document ID
   * @param {Object} updates - Fields to update
   * @param {string} adminId - Admin user ID
   * @returns {Promise<Object>} Result
   */
  async updateAttendance(attendanceId, updates, adminId) {
    try {
      const docRef = doc(db, COLLECTIONS.ATTENDANCE, attendanceId);
      
      await updateDoc(docRef, {
        ...updates,
        updatedAt: Timestamp.now(),
        updatedBy: adminId
      });

      return { success: true, id: attendanceId };
    } catch (error) {
      console.error('Error updating attendance:', error);
      throw new Error('Failed to update attendance record');
    }
  }

  /**
   * Delete an attendance record (admin only)
   * @param {string} attendanceId - Attendance document ID
   * @returns {Promise<Object>} Result
   */
  async deleteAttendance(attendanceId) {
    try {
      const docRef = doc(db, COLLECTIONS.ATTENDANCE, attendanceId);
      await deleteDoc(docRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting attendance:', error);
      throw new Error('Failed to delete attendance record');
    }
  }

  /**
   * Get attendance summary for a date range
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @returns {Promise<Object>} Summary statistics
   */
  async getAttendanceSummary(startDate, endDate) {
    try {
      const result = await this.getAttendanceByDateRange(startDate, endDate, {});
      
      const summary = {
        totalRecords: result.total,
        uniqueTeachers: new Set(result.records.map(r => r.userId)).size,
        byDate: {},
        byStatus: {
          Present: 0,
          Late: 0,
          Absent: 0,
          'Half Day': 0,
          Leave: 0
        }
      };

      result.records.forEach(record => {
        // Group by date
        if (!summary.byDate[record.date]) {
          summary.byDate[record.date] = {
            total: 0,
            Present: 0,
            Late: 0,
            Absent: 0,
            'Half Day': 0,
            Leave: 0
          };
        }
        
        summary.byDate[record.date].total++;
        summary.byDate[record.date][record.status]++;
        summary.byStatus[record.status]++;
      });

      return summary;
    } catch (error) {
      console.error('Error getting attendance summary:', error);
      throw new Error('Failed to get attendance summary');
    }
  }
}

export default new AttendanceService();