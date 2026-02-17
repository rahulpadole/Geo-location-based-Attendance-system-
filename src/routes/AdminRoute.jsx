import { Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";

export default function AdminRoute({ children, redirectPath = "/" }) {
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAllowed(false);
        setLoading(false);
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (
          userSnap.exists() &&
          userSnap.data().role === "admin" &&
          userSnap.data().active === true
        ) {
          setAllowed(true);
        } else {
          setAllowed(false);
        }
      } catch (err) {
        console.error("Error checking user role:", err);
        setAllowed(false);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading)
    return (
      <div style={{ textAlign: "center", marginTop: 50 }}>
        <p>Checking access...</p>
      </div>
    );

  return allowed ? children : <Navigate to={redirectPath} replace />;
}
