/**
 * Location utility functions
 * Ensure consistent distance calculation across all components
 */

// Convert degrees to radians
const deg2rad = (deg) => deg * (Math.PI / 180);

/**
 * Calculate distance between two coordinates in meters
 * Uses Haversine formula for accuracy
 */
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  
  const R = 6371000; // Earth's radius in meters
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c; // Distance in meters
};

/**
 * Calculate distance in kilometers
 */
export const calculateDistanceInKm = (lat1, lon1, lat2, lon2) => {
  const meters = calculateDistance(lat1, lon1, lat2, lon2);
  return meters ? meters / 1000 : null;
};

/**
 * Check if user is within allowed radius
 */
export const isWithinRadius = (userLat, userLon, collegeLat, collegeLon, radiusMeters = 150) => {
  const distance = calculateDistance(userLat, userLon, collegeLat, collegeLon);
  return distance !== null && distance <= radiusMeters;
};

/**
 * Get GPS quality based on accuracy
 */
export const getGpsQuality = (accuracy) => {
  if (!accuracy) return 'unknown';
  if (accuracy <= 10) return 'excellent';
  if (accuracy <= 30) return 'good';
  if (accuracy <= 50) return 'medium';
  if (accuracy <= 100) return 'poor';
  return 'very_poor';
};

/**
 * Format distance for display
 */
export const formatDistance = (meters) => {
  if (meters === null || meters === undefined) return 'Unknown';
  if (meters < 1000) {
    return `${Math.round(meters)} meters`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
};

/**
 * Get color for GPS quality
 */
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

/**
 * Get icon for GPS quality
 */
export const getGpsIcon = (quality) => {
  switch(quality) {
    case 'excellent': return '🟢';
    case 'good': return '🟢';
    case 'medium': return '🟡';
    case 'poor': return '🟠';
    case 'very_poor': return '🔴';
    default: return '⚪';
  }
};