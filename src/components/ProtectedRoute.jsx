import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { auth, db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, allowedRole }) => {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const checkAuth = async () => {
      try {
        const user = auth.currentUser;
        
        if (!user) {
          if (isMounted) setAuthorized(false);
          if (isMounted) setLoading(false);
          return;
        }

        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (!userDoc.exists()) {
          if (isMounted) setAuthorized(false);
          if (isMounted) setLoading(false);
          return;
        }

        const userData = userDoc.data();
        
        if (userData.role === allowedRole && userData.isActive === true) {
          if (isMounted) setAuthorized(true);
        } else {
          if (isMounted) setAuthorized(false);
        }
      } catch (error) {
        console.error('Auth check error:', error);
        if (isMounted) setAuthorized(false);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    checkAuth();

    return () => {
      isMounted = false;
    };
  }, [allowedRole]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return authorized ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;