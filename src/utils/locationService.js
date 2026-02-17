/**
 * Enhanced Location Service with better accuracy and caching prevention
 */

// Calculate distance using Haversine formula (returns meters)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

// Check if location is accurate enough
export const isLocationAccurate = (accuracy, requiredAccuracy = 100) => {
  return accuracy <= requiredAccuracy;
};

// Get location with multiple attempts and fallbacks
export const getAccurateLocation = (options = {}) => {
  return new Promise((resolve, reject) => {
    const {
      timeout = 30000,
      maximumAge = 0, // Don't use cached locations
      desiredAccuracy = 100, // Want accuracy within 100 meters
      maxAttempts = 3
    } = options;

    let attempts = 0;
    let bestLocation = null;
    let bestAccuracy = Infinity;

    const tryGetLocation = () => {
      attempts++;
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const accuracy = position.coords.accuracy;
          
          // Keep track of best location so far
          if (accuracy < bestAccuracy) {
            bestLocation = position;
            bestAccuracy = accuracy;
          }

          // If accuracy is good enough or we've tried max attempts, resolve
          if (accuracy <= desiredAccuracy || attempts >= maxAttempts) {
            resolve({
              position: bestLocation || position,
              accuracy: bestAccuracy,
              attempts: attempts,
              success: true
            });
          } else {
            // Try again with more time
            setTimeout(tryGetLocation, 2000);
          }
        },
        (error) => {
          console.log(`Location attempt ${attempts} failed:`, error.code);
          
          if (attempts >= maxAttempts) {
            if (bestLocation) {
              // Return best location we got even if not accurate enough
              resolve({
                position: bestLocation,
                accuracy: bestAccuracy,
                attempts: attempts,
                success: true,
                warning: "Could not achieve desired accuracy"
              });
            } else {
              reject(error);
            }
          } else {
            // Try again after delay
            setTimeout(tryGetLocation, 2000);
          }
        },
        {
          enableHighAccuracy: true,
          timeout: timeout / maxAttempts,
          maximumAge: maximumAge
        }
      );
    };

    tryGetLocation();
  });
};

// Get location with fallback to less accurate but faster methods
export const getLocationWithFallback = async () => {
  // First try: High accuracy (takes longer but more precise)
  try {
    const result = await getAccurateLocation({
      timeout: 20000,
      desiredAccuracy: 50,
      maxAttempts: 2
    });
    return { ...result, method: 'high_accuracy' };
  } catch (highAccuracyError) {
    console.log("High accuracy failed, trying fallback...");
    
    // Second try: Standard accuracy (faster)
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 10000,
          maximumAge: 60000 // Allow 1 minute old positions
        });
      });
      
      return {
        position,
        accuracy: position.coords.accuracy,
        method: 'standard',
        success: true
      };
    } catch (standardError) {
      // Third try: Any location (even cached)
      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: false,
            timeout: 5000,
            maximumAge: 300000 // Allow 5 minute old positions
          });
        });
        
        return {
          position,
          accuracy: position.coords.accuracy,
          method: 'cached',
          success: true,
          warning: 'Using cached location'
        };
      } catch (error) {
        throw error;
      }
    }
  }
};

// Watch location with accuracy filtering
export const watchAccurateLocation = (callback, collegeLat, collegeLng, radius = 150) => {
  let lastAccurateLocation = null;

  return navigator.geolocation.watchPosition(
    (position) => {
      const accuracy = position.coords.accuracy;
      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        collegeLat,
        collegeLng
      );
      
      const isAccurate = accuracy <= 100;
      const isInside = distance <= radius;
      
      callback({
        position,
        accuracy,
        distance,
        isAccurate,
        isInside,
        timestamp: new Date().toISOString()
      });
    },
    (error) => {
      console.error("Watch position error:", error);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000
    }
  );
};

// Get GPS signal quality description
export const getGpsQuality = (accuracy) => {
  if (!accuracy) return 'unknown';
  if (accuracy <= 30) return 'excellent';
  if (accuracy <= 50) return 'good';
  if (accuracy <= 100) return 'medium';
  if (accuracy <= 500) return 'poor';
  return 'very_poor';
};

// Get color for GPS quality
export const getGpsColor = (quality) => {
  switch(quality) {
    case 'excellent': return '#2e7d32';
    case 'good': return '#388e3c';
    case 'medium': return '#ed6c02';
    case 'poor': return '#d32f2f';
    case 'very_poor': return '#b71c1c';
    default: return '#666';
  }
};

// Get emoji for GPS quality
export const getGpsEmoji = (quality) => {
  switch(quality) {
    case 'excellent': return '🟢';
    case 'good': return '🟢';
    case 'medium': return '🟡';
    case 'poor': return '🟠';
    case 'very_poor': return '🔴';
    default: return '⚪';
  }
};