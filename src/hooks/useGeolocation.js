import { useState, useEffect, useCallback } from 'react';
import { useToast } from './useToast';

export const useGeolocation = (options = { enableHighAccuracy: true, timeout: 10000 }) => {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const getLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      showToast('Geolocation not supported', 'error');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        });
        setLoading(false);
      },
      (err) => {
        let message = 'Failed to get location';
        switch (err.code) {
          case err.PERMISSION_DENIED:
            message = 'Location permission denied';
            break;
          case err.POSITION_UNAVAILABLE:
            message = 'Location unavailable';
            break;
          case err.TIMEOUT:
            message = 'Location request timeout';
            break;
        }
        setError(message);
        showToast(message, 'error');
        setLoading(false);
      },
      options
    );
  }, [options, showToast]);

  const watchLocation = useCallback((callback) => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return null;
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        setLocation(newLocation);
        callback?.(newLocation);
      },
      (err) => {
        console.error('Watch position error:', err);
      },
      options
    );

    return watchId;
  }, [options]);

  const stopWatching = useCallback((watchId) => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  return {
    location,
    error,
    loading,
    getLocation,
    watchLocation,
    stopWatching
  };
};