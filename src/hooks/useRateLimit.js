import { useState, useRef, useCallback } from 'react';

export const useRateLimit = (maxAttempts = 5, timeWindow = 60000) => {
  const [attempts, setAttempts] = useState([]);
  const [blocked, setBlocked] = useState(false);
  const timeoutRef = useRef(null);

  const checkRateLimit = useCallback(() => {
    if (blocked) {
      return { allowed: false, blocked: true };
    }

    const now = Date.now();
    const recentAttempts = attempts.filter(time => now - time < timeWindow);
    
    if (recentAttempts.length >= maxAttempts) {
      setBlocked(true);
      
      // Auto unblock after timeWindow
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setBlocked(false);
        setAttempts([]);
      }, timeWindow);
      
      const oldestAttempt = recentAttempts[0];
      const waitTime = Math.ceil((timeWindow - (now - oldestAttempt)) / 1000);
      return {
        allowed: false,
        blocked: true,
        waitTime
      };
    }
    
    return { allowed: true };
  }, [attempts, blocked, maxAttempts, timeWindow]);

  const addAttempt = useCallback(() => {
    setAttempts(prev => [...prev, Date.now()]);
  }, []);

  const resetAttempts = useCallback(() => {
    setAttempts([]);
    setBlocked(false);
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { checkRateLimit, addAttempt, resetAttempts, blocked };
};