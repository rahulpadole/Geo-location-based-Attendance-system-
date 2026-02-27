import { db } from "./firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

// Simple in-memory cache
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export class BaseService {
  constructor(collectionName) {
    this.collectionName = collectionName;
    this.collectionRef = collection(db, collectionName);
  }

  // Get with caching
  async getWithCache(key, queryFn) {
    const cached = cache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Cache hit for ${key}`);
      return cached.data;
    }

    console.log(`Cache miss for ${key}, fetching...`);
    const data = await queryFn();
    
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    return data;
  }

  // Clear cache for a key
  clearCache(key) {
    cache.delete(key);
  }

  // Clear all cache
  clearAllCache() {
    cache.clear();
  }

  // Efficient query with proper indexes
  async queryWithFilters(filters = {}, orderByField = null, orderDirection = 'asc') {
    let constraints = [];
    
    // Add where clauses
    Object.entries(filters).forEach(([field, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        constraints.push(where(field, '==', value));
      }
    });
    
    // Add orderBy if needed
    if (orderByField) {
      constraints.push(orderBy(orderByField, orderDirection));
    }
    
    const q = query(this.collectionRef, ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }
}

// Export service instances
export const usersService = new BaseService('users');
export const attendanceService = new BaseService('attendance');
export const holidaysService = new BaseService('holidays');