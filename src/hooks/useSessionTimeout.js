import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { useToast } from './useToast';
import { DEFAULTS } from '../constants';

export const useSessionTimeout = (timeout = DEFAULTS.SESSION_TIMEOUT) => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);

  const resetTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }

    // Show warning 1 minute before timeout
    warningRef.current = setTimeout(() => {
      showToast('Your session will expire in 1 minute', 'warning');
    }, timeout - 60000);

    // Logout after timeout
    timeoutRef.current = setTimeout(async () => {
      try {
        await auth.signOut();
        showToast('Session expired. Please login again.', 'info');
        navigate('/login');
      } catch (error) {
        console.error('Logout error:', error);
      }
    }, timeout);
  }, [timeout, navigate, showToast]);

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimeout();
    };

    // Start timeout on mount
    resetTimeout();

    // Add event listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity);
    });

    return () => {
      // Cleanup
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
    };
  }, [resetTimeout]);

  return { resetTimeout };
};