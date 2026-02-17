import { useEffect, useRef, useState, useCallback } from "react";
import { auth, db } from "../services/firebase";
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import LoadingSpinner from "../components/LoadingSpinner";
import ChangePassword from "../components/ChangePassword"; // Import password change component
import { calculateDistance } from "../utils/location";
import { getCSRFToken, CSRFField } from "../utils/csrf";
import { useRateLimit } from "../hooks/useRateLimit";

export default function MarkAttendance() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { checkRateLimit, addAttempt, blocked } = useRateLimit(3, 60000); // 3 attempts per minute

  // State management - grouped to avoid race conditions
  const [state, setState] = useState({
    loading: false,
    locationAllowed: false,
    selfieTaken: false,
    message: "",
    distance: null,
    accuracy: null,
    status: "checking",
    attendanceMarked: false,
    showPasswordChange: false,
    collegeSettings: null,
    todayAttendance: null
  });

  // Form state
  const [lateReason, setLateReason] = useState("");
  const [showLateReason, setShowLateReason] = useState(false);
  
  // Refs for cleanup
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const mountedRef = useRef(true);
  const locationWatcherRef = useRef(null);
  const csrfToken = useRef(getCSRFToken());

  // Safe state update
  const safeSetState = useCallback((updates) => {
    if (mountedRef.current) {
      setState(prev => ({ ...prev, ...updates }));
    }
  }, []);

  // Check if user needs to change password
  const checkPasswordStatus = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists() && userDoc.data().requirePasswordChange) {
        safeSetState({ showPasswordChange: true });
        showToast("Please change your password before continuing", "warning");
      }
    } catch (error) {
      console.error("Error checking password status:", error);
    }
  }, [safeSetState, showToast]);

  // Load college settings and today's attendance
  const loadInitialData = useCallback(async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      // Load college settings
      const settingsSnap = await getDoc(doc(db, "collegeSettings", "main"));
      if (!settingsSnap.exists()) {
        safeSetState({ 
          message: "College settings not configured. Please contact admin.",
          status: "error"
        });
        return;
      }

      const settings = settingsSnap.data();
      safeSetState({ collegeSettings: settings });

      // Check if already marked attendance today
      const today = new Date().toISOString().split("T")[0];
      const attendanceQuery = query(
        collection(db, "attendance"),
        where("userId", "==", user.uid),
        where("date", "==", today)
      );
      
      const attendanceSnap = await getDocs(attendanceQuery);
      
      if (!attendanceSnap.empty) {
        const attendance = attendanceSnap.docs[0].data();
        safeSetState({ 
          todayAttendance: attendance,
          status: attendance.outTime ? "completed" : "checked_in"
        });
        
        if (attendance.outTime) {
          setState(prev => ({ ...prev, message: "You have already completed attendance for today ✅" }));
        } else {
          setState(prev => ({ ...prev, message: "You are checked in. Ready to check out?" }));
        }
      }

    } catch (error) {
      console.error("Error loading initial data:", error);
      showToast("Failed to load data", "error");
    }
  }, [navigate, safeSetState, showToast]);

  // Start camera with cleanup
  const startCamera = useCallback(async () => {
    try {
      // Check if media devices are supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        showToast("Camera not supported on this device", "error");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 320 },
          height: { ideal: 240 },
          facingMode: "user"
        } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current && mountedRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      let errorMessage = "Camera access denied";
      if (err.name === "NotAllowedError") {
        errorMessage = "Please allow camera access to take selfie";
      } else if (err.name === "NotFoundError") {
        errorMessage = "No camera found on this device";
      }
      showToast(errorMessage, "error");
    }
  }, [showToast]);

  // Stop camera
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Check location with rate limiting
  const checkLocation = useCallback(async () => {
    // Check rate limit
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      if (rateLimit.blocked) {
        showToast(`Too many attempts. Please wait ${rateLimit.waitTime} seconds.`, "error");
      }
      return;
    }

    safeSetState({ loading: true, message: "Fetching location..." });
    addAttempt(); // Add attempt for rate limiting
    
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate("/login");
        return;
      }

      if (!state.collegeSettings) {
        throw new Error("College settings not loaded");
      }

      const { latitude, longitude, radius } = state.collegeSettings;

      // Get current position with high accuracy
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });
      });

      if (!mountedRef.current) return;

      const distance = calculateDistance(
        position.coords.latitude,
        position.coords.longitude,
        latitude,
        longitude
      );

      const allowed = distance <= (radius || 150);

      safeSetState({
        distance,
        accuracy: position.coords.accuracy,
        locationAllowed: allowed,
        loading: false,
        message: allowed 
          ? `✅ Inside campus (${distance.toFixed(1)}m from college)` 
          : `❌ Outside campus (${(distance/1000).toFixed(2)}km away)`
      });

      // Start watching location if inside campus
      if (allowed && !locationWatcherRef.current) {
        locationWatcherRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (!mountedRef.current) return;
            const newDistance = calculateDistance(
              pos.coords.latitude,
              pos.coords.longitude,
              latitude,
              longitude
            );
            const stillAllowed = newDistance <= (radius || 150);
            
            safeSetState({
              distance: newDistance,
              locationAllowed: stillAllowed,
              message: stillAllowed 
                ? `✅ Inside campus (${newDistance.toFixed(1)}m)` 
                : `❌ You left campus (${(newDistance/1000).toFixed(2)}km)`
            });
          },
          (err) => console.error("Watch position error:", err),
          { enableHighAccuracy: true, maximumAge: 30000 }
        );
      }

    } catch (error) {
      if (mountedRef.current) {
        let errorMessage = "Failed to get location";
        if (error.code === 1) {
          errorMessage = "Location permission denied";
        } else if (error.code === 2) {
          errorMessage = "Location unavailable";
        } else if (error.code === 3) {
          errorMessage = "Location request timeout";
        }
        
        safeSetState({
          message: `❌ ${errorMessage}`,
          locationAllowed: false,
          loading: false
        });
        showToast(errorMessage, "error");
      }
    }
  }, [state.collegeSettings, checkRateLimit, addAttempt, navigate, safeSetState, showToast]);

  // Take selfie
  const takeSelfie = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) {
      showToast("Camera not ready", "error");
      return;
    }
    
    const ctx = canvasRef.current.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    
    // Convert to base64 for storage (optional)
    const selfieData = canvasRef.current.toDataURL("image/jpeg", 0.8);
    
    safeSetState({ selfieTaken: true });
    showToast("Selfie captured successfully", "success");
    
    // Stop camera after selfie to save resources
    stopCamera();
  }, [safeSetState, showToast, stopCamera]);

  // Check if late
  const checkIfLate = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const timetableSnap = await getDoc(doc(db, "timetable", today));
      
      if (!timetableSnap.exists()) {
        return false;
      }

      const { lateAfter } = timetableSnap.data();
      const now = new Date();
      const [lateHour, lateMinute] = lateAfter.split(':').map(Number);
      
      const lateTime = new Date();
      lateTime.setHours(lateHour, lateMinute, 0, 0);
      
      const isLate = now > lateTime;
      setShowLateReason(isLate);
      return isLate;
      
    } catch (error) {
      console.error("Error checking late status:", error);
      return false;
    }
  }, []);

  // Handle attendance marking
  const handleAttendance = useCallback(async () => {
    // Validate all conditions
    if (!state.locationAllowed) {
      showToast("You must be inside the campus", "error");
      return;
    }
    
    if (!state.selfieTaken && state.status !== "checked_in") {
      showToast("Selfie is required", "error");
      return;
    }

    if (showLateReason && !lateReason.trim()) {
      showToast("Please provide a reason for being late", "error");
      return;
    }

    safeSetState({ loading: true });

    try {
      const user = auth.currentUser;
      const today = new Date().toISOString().split("T")[0];
      const docId = `${user.uid}_${today}`;
      const attendanceRef = doc(db, "attendance", docId);

      const isLate = await checkIfLate();
      const now = serverTimestamp();
      
      // Prepare location data
      const locationData = state.distance ? {
        distance: state.distance,
        accuracy: state.accuracy,
        timestamp: new Date().toISOString()
      } : null;

      if (state.status === "checked_in") {
        // Check out
        await updateDoc(attendanceRef, {
          outTime: now,
          outLocation: locationData,
          updatedAt: now,
          updatedBy: user.uid
        });
        
        safeSetState({ 
          status: "completed",
          message: "Check out successful!",
          attendanceMarked: true 
        });
        
        showToast("Checked out successfully ✅", "success");
        
      } else {
        // Check in
        const attendanceData = {
          userId: user.uid,
          userName: user.displayName || user.email,
          date: today,
          inTime: now,
          status: isLate ? "Late" : "Present",
          lateReason: isLate ? lateReason : "",
          inLocation: locationData,
          createdAt: now,
          createdBy: user.uid,
          csrfToken: csrfToken.current // CSRF protection
        };

        await setDoc(attendanceRef, attendanceData);
        
        safeSetState({ 
          status: "checked_in",
          message: "Check in successful!",
          attendanceMarked: true 
        });
        
        showToast("Checked in successfully ✅", "success");
      }

      // Log to audit
      await setDoc(doc(collection(db, "auditLogs")), {
        userId: user.uid,
        userEmail: user.email,
        action: state.status === "checked_in" ? "ATTENDANCE_CHECK_OUT" : "ATTENDANCE_CHECK_IN",
        timestamp: now,
        details: {
          date: today,
          status: isLate ? "Late" : "Present",
          location: locationData
        }
      });

    } catch (error) {
      console.error("Attendance error:", error);
      showToast(error.message, "error");
    } finally {
      safeSetState({ loading: false });
    }
  }, [state, showLateReason, lateReason, checkIfLate, showToast, safeSetState]);

  // Initialize component
  useEffect(() => {
    mountedRef.current = true;
    
    const init = async () => {
      await checkPasswordStatus();
      await loadInitialData();
      await startCamera();
    };
    
    init();

    // Cleanup function
    return () => {
      mountedRef.current = false;
      
      // Stop camera
      stopCamera();
      
      // Clear location watcher
      if (locationWatcherRef.current) {
        navigator.geolocation.clearWatch(locationWatcherRef.current);
      }
      
      // Clear any timeouts
      if (window.attendanceTimeout) {
        clearTimeout(window.attendanceTimeout);
      }
    };
  }, [checkPasswordStatus, loadInitialData, startCamera, stopCamera]);

  // If password change required
  if (state.showPasswordChange) {
    return (
      <div style={styles.container}>
        <ChangePassword 
          onSuccess={() => safeSetState({ showPasswordChange: false })}
          onCancel={() => navigate("/teacher/dashboard")}
        />
      </div>
    );
  }

  // If attendance already completed
  if (state.status === "completed") {
    return (
      <div style={styles.completedContainer}>
        <h2>{state.message}</h2>
        <p>Thank you for marking your attendance today.</p>
        <button 
          onClick={() => navigate("/teacher/dashboard")}
          style={styles.primaryButton}
        >
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>
        {state.status === "checked_in" ? "Mark Check Out" : "Mark Attendance"}
      </h2>

      {/* CSRF Token Field */}
      <CSRFField />
      
      {/* Location Section */}
      <div style={styles.section}>
        <button 
          onClick={checkLocation} 
          disabled={state.loading || blocked}
          style={{
            ...styles.button,
            ...(state.locationAllowed ? styles.successButton : styles.primaryButton)
          }}
        >
          {state.loading ? <LoadingSpinner size="small" /> : "📍 Verify Location"}
        </button>
        
        {state.distance !== null && (
          <div style={styles.locationInfo}>
            <p style={styles.distance}>
              Distance: {state.distance < 1000 
                ? `${state.distance.toFixed(1)} meters` 
                : `${(state.distance/1000).toFixed(2)} kilometers`}
            </p>
            {state.accuracy && (
              <p style={styles.accuracy}>
                Accuracy: ±{state.accuracy.toFixed(0)} meters
              </p>
            )}
          </div>
        )}
        
        <p style={{
          ...styles.message,
          color: state.locationAllowed ? '#2e7d32' : '#d32f2f'
        }}>
          {state.message || "Click 'Verify Location' to check your location"}
        </p>
      </div>

      {/* Selfie Section - Only for check in */}
      {state.status !== "checked_in" && (
        <div style={styles.section}>
          <div style={styles.cameraContainer}>
            <video 
              ref={videoRef} 
              width="320" 
              height="240" 
              autoPlay 
              playsInline
              muted
              style={styles.video} 
            />
            <canvas 
              ref={canvasRef} 
              width="320" 
              height="240" 
              style={{ display: 'none' }} 
            />
          </div>
          
          <button 
            onClick={takeSelfie} 
            disabled={!state.locationAllowed || state.loading}
            style={{
              ...styles.button,
              ...(state.selfieTaken ? styles.successButton : styles.primaryButton)
            }}
          >
            📸 {state.selfieTaken ? "Selfie Captured" : "Take Selfie"}
          </button>
          
          {state.selfieTaken && (
            <p style={styles.successMessage}>✅ Selfie captured successfully</p>
          )}
        </div>
      )}

      {/* Late Reason - Show only if late */}
      {showLateReason && state.status !== "checked_in" && (
        <div style={styles.section}>
          <label style={styles.label}>Reason for being late:</label>
          <textarea
            value={lateReason}
            onChange={(e) => setLateReason(e.target.value)}
            placeholder="Please explain why you are late..."
            style={styles.textarea}
            rows="3"
            maxLength="200"
          />
          <small style={styles.hint}>
            {lateReason.length}/200 characters
          </small>
        </div>
      )}

      {/* Submit Button */}
      <button 
        onClick={handleAttendance} 
        disabled={
          state.loading || 
          !state.locationAllowed || 
          (state.status !== "checked_in" && !state.selfieTaken) ||
          (showLateReason && !lateReason.trim() && state.status !== "checked_in")
        }
        style={{
          ...styles.primaryButton,
          ...styles.submitButton,
          opacity: state.loading || !state.locationAllowed ? 0.6 : 1
        }}
      >
        {state.loading ? (
          <LoadingSpinner size="small" />
        ) : (
          state.status === "checked_in" ? "✅ Confirm Check Out" : "✅ Confirm Check In"
        )}
      </button>

      {/* Additional Info */}
      <div style={styles.infoBox}>
        <p style={styles.infoText}>
          <strong>📍 Note:</strong> You must be within the college campus to mark attendance.
          {state.status !== "checked_in" && " Selfie is required for check in."}
        </p>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    maxWidth: 500,
    margin: "0 auto",
    padding: "20px",
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },
  completedContainer: {
    maxWidth: 500,
    margin: "40px auto",
    padding: "40px 20px",
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    textAlign: "center"
  },
  title: {
    textAlign: "center",
    color: "#333",
    marginBottom: 30,
    marginTop: 0
  },
  section: {
    marginBottom: 25,
    padding: "15px",
    backgroundColor: "#f9f9f9",
    borderRadius: 8
  },
  button: {
    width: "100%",
    padding: "14px",
    marginTop: 10,
    borderRadius: 8,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: "bold",
    border: "none",
    transition: "all 0.3s ease",
    minHeight: "44px"
  },
  primaryButton: {
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none"
  },
  successButton: {
    backgroundColor: "#2e7d32",
    color: "#fff"
  },
  submitButton: {
    marginTop: 20,
    padding: "16px",
    fontSize: 18
  },
  locationInfo: {
    marginTop: 10,
    padding: "10px",
    backgroundColor: "#fff",
    borderRadius: 6
  },
  distance: {
    margin: 0,
    fontWeight: "bold",
    color: "#1976d2"
  },
  accuracy: {
    margin: "5px 0 0 0",
    fontSize: 12,
    color: "#666"
  },
  message: {
    marginTop: 10,
    padding: "10px",
    backgroundColor: "#fff",
    borderRadius: 6,
    textAlign: "center",
    fontWeight: "bold"
  },
  cameraContainer: {
    display: "flex",
    justifyContent: "center",
    marginBottom: 15
  },
  video: {
    width: "100%",
    maxWidth: 320,
    height: "auto",
    borderRadius: 8,
    backgroundColor: "#000",
    border: "2px solid #ddd"
  },
  successMessage: {
    color: "#2e7d32",
    marginTop: 10,
    textAlign: "center",
    fontWeight: "bold"
  },
  label: {
    display: "block",
    marginBottom: 8,
    fontWeight: 500,
    color: "#555"
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    fontFamily: "inherit",
    resize: "vertical",
    boxSizing: "border-box"
  },
  hint: {
    display: "block",
    marginTop: 5,
    color: "#666",
    fontSize: 12
  },
  infoBox: {
    marginTop: 25,
    padding: "15px",
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    borderLeft: "4px solid #1976d2"
  },
  infoText: {
    margin: 0,
    color: "#0d47a1",
    fontSize: 14,
    lineHeight: 1.6
  }
};