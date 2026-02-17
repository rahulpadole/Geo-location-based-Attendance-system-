import { useState, useCallback } from 'react';
import { getLiveLocation, calculateDistance } from '../utils/location';
import { useToast } from './useToast';

export const useLocation = (collegeSettings) => {
  const [location, setLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [isWithinCampus, setIsWithinCampus] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const checkLocation = useCallback(async () => {
    if (!collegeSettings) {
      showToast('College settings not loaded', 'error');
      return false;
    }

    setLoading(true);
    try {
      const position = await getLiveLocation();
      const { latitude, longitude } = position.coords;
      
      const dist = calculateDistance(
        latitude,
        longitude,
        collegeSettings.latitude,
        collegeSettings.longitude
      );

      const within = dist <= (collegeSettings.radius || 150);
      
      setLocation({ lat: latitude, lng: longitude });
      setDistance(dist);
      setIsWithinCampus(within);
      
      return within;
    } catch (error) {
      showToast(error.message, 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [collegeSettings, showToast]);

  return {
    location,
    distance,
    isWithinCampus,
    loading,
    checkLocation
  };
};