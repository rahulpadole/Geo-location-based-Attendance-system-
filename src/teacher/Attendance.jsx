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
  getDocs,
  addDoc
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import LoadingSpinner from "../components/LoadingSpinner";
import ChangePassword from "../components/ChangePassword";
import { calculateDistance, getGpsQuality, formatDistance, getGpsColor, getGpsIcon } from "../utils/location";
import { getCSRFToken, CSRFField } from "../utils/csrf";
import { useRateLimit } from "../hooks/useRateLimit";

export default function MarkAttendance() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { checkRateLimit, addAttempt, blocked } = useRateLimit(3, 60000);

  // State management
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
    todayAttendance: null,
    gpsQuality: 'unknown'
  });

  // Form state
  const [lateReason, setLateReason] = useState("");
  const [showLateReason, setShowLateReason] = useState(false);
  const [activeStep, setActiveStep] = useState(1);
  
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
      console.log("College Settings loaded:", settings);
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
          safeSetState({ message: "You have already completed attendance for today ✅" });
        } else {
          safeSetState({ message: "You are checked in. Ready to check out?" });
          setActiveStep(3);
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

  // Check if late
  const checkIfLate = useCallback(async () => {
    try {
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      const timetableSnap = await getDoc(doc(db, "timetable", today));
      
      if (!timetableSnap.exists()) {
        console.log("No timetable found for today");
        return false;
      }

      const { lateAfter } = timetableSnap.data();
      const now = new Date();
      
      const [lateHour, lateMinute] = lateAfter.split(':').map(Number);
      
      const lateTime = new Date();
      lateTime.setHours(lateHour, lateMinute, 0, 0);
      
      const isLate = now > lateTime;
      console.log("Late check:", { now, lateTime, isLate });
      
      if (isLate) {
        setShowLateReason(true);
        showToast("You are late. Please provide a reason.", "warning");
      } else {
        setShowLateReason(false);
      }
      
      return isLate;
      
    } catch (error) {
      console.error("Error checking late status:", error);
      return false;
    }
  }, [showToast]);

  // Check location with rate limiting
  const checkLocation = useCallback(async () => {
    const rateLimit = checkRateLimit();
    if (!rateLimit.allowed) {
      if (rateLimit.blocked) {
        showToast(`Too many attempts. Please wait ${rateLimit.waitTime} seconds.`, "error");
      }
      return;
    }

    safeSetState({ loading: true, message: "Fetching your precise location..." });
    addAttempt();
    
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
      
      console.log("College Location:", { latitude, longitude, radius });

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
        Number(latitude),
        Number(longitude)
      );

      console.log("User Location:", {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy,
        distance: distance,
        radius: radius
      });

      const allowed = distance <= (Number(radius) || 150);
      const gpsQuality = getGpsQuality(position.coords.accuracy);

      safeSetState({
        distance,
        accuracy: position.coords.accuracy,
        locationAllowed: allowed,
        gpsQuality,
        loading: false,
        message: allowed 
          ? `✅ You are inside campus (${formatDistance(distance)})` 
          : `❌ You are outside campus (${formatDistance(distance)})`
      });

      if (allowed) {
        setActiveStep(2);
      }

      if (allowed && !locationWatcherRef.current) {
        locationWatcherRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            if (!mountedRef.current) return;
            const newDistance = calculateDistance(
              pos.coords.latitude,
              pos.coords.longitude,
              Number(latitude),
              Number(longitude)
            );
            const stillAllowed = newDistance <= (Number(radius) || 150);
            const newQuality = getGpsQuality(pos.coords.accuracy);
            
            safeSetState({
              distance: newDistance,
              locationAllowed: stillAllowed,
              gpsQuality: newQuality,
              accuracy: pos.coords.accuracy,
              message: stillAllowed 
                ? `✅ Inside campus (${formatDistance(newDistance)})` 
                : `❌ You left campus! (${formatDistance(newDistance)})`
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
          loading: false,
          gpsQuality: 'poor'
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
    
    safeSetState({ selfieTaken: true });
    showToast("Selfie captured successfully", "success");
    setActiveStep(3);
    
    stopCamera();
  }, [safeSetState, showToast, stopCamera]);

  // Handle attendance marking
  const handleAttendance = useCallback(async () => {
    if (!state.locationAllowed) {
      showToast("You must be inside the campus", "error");
      return;
    }
    
    if (!state.selfieTaken && state.status !== "checked_in") {
      showToast("Selfie is required for check-in", "error");
      return;
    }

    if (showLateReason && !lateReason.trim() && state.status !== "checked_in") {
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
      
      const locationData = state.distance ? {
        distance: state.distance,
        accuracy: state.accuracy,
        quality: state.gpsQuality,
        timestamp: new Date().toISOString()
      } : null;

      if (state.status === "checked_in") {
        // CHECK OUT
        await updateDoc(attendanceRef, {
          outTime: now,
          outLocation: locationData,
          updatedAt: now,
          updatedBy: user.uid
        });
        
        safeSetState({ 
          status: "completed",
          message: "Check out successful! Have a great day!",
          attendanceMarked: true 
        });
        
        showToast("✅ Checked out successfully", "success");
        
        // Trigger dashboard refresh
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('attendance-updated', { 
            detail: { action: 'checkout', date: today }
          }));
          navigate("/teacher/dashboard");
        }, 2000);
        
      } else {
        // CHECK IN - IMPORTANT: Status sahi se set karo
        const attendanceStatus = isLate ? "Late" : "Present";
        
        console.log("Saving attendance with status:", attendanceStatus); // Debug log
        
        const attendanceData = {
          userId: user.uid,
          userName: user.displayName || user.email,
          date: today,
          inTime: now,
          status: attendanceStatus, // YEH IMPORTANT HAI
          lateReason: isLate ? lateReason : "",
          inLocation: locationData,
          selfieCaptured: true,
          createdAt: now,
          createdBy: user.uid,
          csrfToken: csrfToken.current
        };

        await setDoc(attendanceRef, attendanceData);
        
        // Verify data was saved
        const verifySnap = await getDoc(attendanceRef);
        console.log("Saved attendance:", verifySnap.data());
        
        safeSetState({ 
          status: "checked_in",
          message: "Check in successful! Don't forget to check out.",
          attendanceMarked: true 
        });
        
        showToast(`✅ Checked in successfully as ${attendanceStatus}`, "success");
        
        // Trigger dashboard refresh
        setTimeout(() => {
          window.dispatchEvent(new CustomEvent('attendance-updated', { 
            detail: { action: 'checkin', status: attendanceStatus, date: today }
          }));
          navigate("/teacher/dashboard");
        }, 2000);
      }

      // Log to audit
      await addDoc(collection(db, "auditLogs"), {
        userId: user.uid,
        userEmail: user.email,
        action: state.status === "checked_in" ? "ATTENDANCE_CHECK_OUT" : "ATTENDANCE_CHECK_IN",
        timestamp: now,
        details: {
          date: today,
          status: isLate ? "Late" : "Present"
        }
      });

    } catch (error) {
      console.error("Attendance error:", error);
      showToast(error.message, "error");
    } finally {
      safeSetState({ loading: false });
    }
  }, [state, showLateReason, lateReason, checkIfLate, showToast, safeSetState, navigate]);

  // Initialize component
  useEffect(() => {
    mountedRef.current = true;
    
    const init = async () => {
      await checkPasswordStatus();
      await loadInitialData();
      await startCamera();
    };
    
    init();

    return () => {
      mountedRef.current = false;
      stopCamera();
      if (locationWatcherRef.current) {
        navigator.geolocation.clearWatch(locationWatcherRef.current);
      }
    };
  }, [checkPasswordStatus, loadInitialData, startCamera, stopCamera]);

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

  if (state.status === "completed") {
    return (
      <div style={styles.completedContainer}>
        <div style={styles.completedIcon}>✅</div>
        <h2 style={styles.completedTitle}>Attendance Completed!</h2>
        <p style={styles.completedMessage}>{state.message}</p>
        <p style={styles.completedSubMessage}>Thank you for using Geo Attendance System.</p>
        <button 
          onClick={() => navigate("/teacher/dashboard")}
          style={styles.dashboardButton}
        >
          ← Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ← Back
        </button>
        <h2 style={styles.title}>
          {state.status === "checked_in" ? "Mark Check Out" : "Mark Attendance"}
        </h2>
      </div>

      <div style={styles.progressContainer}>
        <div style={styles.progressSteps}>
          <div style={{
            ...styles.progressStep,
            ...(activeStep >= 1 ? styles.progressStepActive : {})
          }}>
            <span style={styles.stepNumber}>1</span>
            <span style={styles.stepLabel}>Location</span>
          </div>
          {state.status !== "checked_in" && (
            <div style={{
              ...styles.progressStep,
              ...(activeStep >= 2 ? styles.progressStepActive : {})
            }}>
              <span style={styles.stepNumber}>2</span>
              <span style={styles.stepLabel}>Selfie</span>
            </div>
          )}
          <div style={{
            ...styles.progressStep,
            ...(activeStep >= 3 ? styles.progressStepActive : {})
          }}>
            <span style={styles.stepNumber}>{state.status === "checked_in" ? "2" : "3"}</span>
            <span style={styles.stepLabel}>Confirm</span>
          </div>
        </div>
      </div>

      <CSRFField />

      <div style={styles.card}>
        <div style={styles.section}>
          <div style={styles.sectionHeader}>
            <span style={styles.sectionIcon}>📍</span>
            <h3 style={styles.sectionTitle}>Step 1: Verify Your Location</h3>
          </div>

          {state.gpsQuality !== 'unknown' && (
            <div style={styles.gpsIndicator}>
              <span style={styles.gpsIcon}>{getGpsIcon(state.gpsQuality)}</span>
              <span style={{ color: getGpsColor(state.gpsQuality), fontWeight: 'bold' }}>
                GPS Signal: {
                  state.gpsQuality === 'excellent' ? 'Excellent' :
                  state.gpsQuality === 'good' ? 'Good' :
                  state.gpsQuality === 'medium' ? 'Medium' :
                  state.gpsQuality === 'poor' ? 'Poor' : 'Very Poor'
                }
              </span>
            </div>
          )}
          
          <button 
            onClick={checkLocation} 
            disabled={state.loading || blocked}
            style={{
              ...styles.locationButton,
              backgroundColor: state.locationAllowed ? '#2e7d32' : '#1976d2',
              opacity: state.loading ? 0.7 : 1
            }}
          >
            {state.loading ? (
              <LoadingSpinner size="small" />
            ) : (
              <>
                <span style={styles.buttonIcon}>📍</span>
                {state.locationAllowed ? 'Location Verified ✓' : 'Verify My Location'}
              </>
            )}
          </button>
          
          {state.distance !== null && (
            <div style={styles.locationInfo}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Distance from college:</span>
                <span style={styles.infoValue}>
                  {formatDistance(state.distance)}
                </span>
              </div>
              {state.accuracy && (
                <div style={styles.infoRow}>
                  <span style={styles.infoLabel}>Accuracy:</span>
                  <span style={styles.infoValue}>
                    ±{Math.round(state.accuracy)} meters
                    {state.accuracy > 50 && ' (Move to open area)'}
                  </span>
                </div>
              )}
            </div>
          )}
          
          <p style={{
            ...styles.message,
            color: state.locationAllowed ? '#2e7d32' : 
                   state.message?.includes('❌') ? '#d32f2f' : '#666',
            fontWeight: 'bold'
          }}>
            {state.message || "Click the button above to verify your location"}
          </p>

          {(state.gpsQuality === 'poor' || state.gpsQuality === 'very_poor') && (
            <div style={styles.tipsBox}>
              <p style={styles.tipsTitle}>📍 Tips for better GPS:</p>
              <ul style={styles.tipsList}>
                <li>Move away from buildings</li>
                <li>Go outside or near a window</li>
                <li>Turn on WiFi (helps with location)</li>
                <li>Wait 10-20 seconds for better signal</li>
                <li>Disable any VPN</li>
              </ul>
            </div>
          )}
        </div>

        {state.status !== "checked_in" && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionIcon}>📸</span>
              <h3 style={styles.sectionTitle}>Step 2: Take a Selfie</h3>
            </div>

            <div style={styles.cameraContainer}>
              <video 
                ref={videoRef} 
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
              
              {!state.selfieTaken && (
                <div style={styles.cameraOverlay}>
                  <p>Position your face in the frame</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={takeSelfie} 
              disabled={!state.locationAllowed || state.loading || state.selfieTaken}
              style={{
                ...styles.selfieButton,
                backgroundColor: state.selfieTaken ? '#2e7d32' : '#1976d2',
                opacity: !state.locationAllowed ? 0.5 : 1
              }}
            >
              <span style={styles.buttonIcon}>
                {state.selfieTaken ? '✓' : '📸'}
              </span>
              {state.selfieTaken ? 'Selfie Captured' : 'Capture Selfie'}
            </button>
            
            {state.selfieTaken && (
              <p style={styles.successMessage}>
                ✅ Selfie captured successfully
              </p>
            )}
          </div>
        )}

        {showLateReason && state.status !== "checked_in" && (
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <span style={styles.sectionIcon}>⏰</span>
              <h3 style={styles.sectionTitle}>Late Arrival</h3>
            </div>
            
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

        <button 
          onClick={handleAttendance} 
          disabled={
            state.loading || 
            !state.locationAllowed || 
            (state.status !== "checked_in" && !state.selfieTaken) ||
            (showLateReason && !lateReason.trim() && state.status !== "checked_in")
          }
          style={{
            ...styles.submitButton,
            backgroundColor: state.status === "checked_in" ? '#1976d2' : '#2e7d32',
            opacity: !state.locationAllowed ? 0.5 : 1
          }}
        >
          {state.loading ? (
            <LoadingSpinner size="small" />
          ) : (
            <>
              <span style={styles.buttonIcon}>
                {state.status === "checked_in" ? '👋' : '✅'}
              </span>
              {state.status === "checked_in" ? "Confirm Check Out" : "Confirm Check In"}
            </>
          )}
        </button>

        <div style={styles.infoBox}>
          <p style={styles.infoText}>
            <strong>📍 Important:</strong> You must be within the college campus to mark attendance.
            {state.status !== "checked_in" && " A clear selfie is required for check-in."}
          </p>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 600,
    margin: "30px auto",
    padding: "0 20px"
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "20px"
  },
  backButton: {
    padding: "8px 16px",
    cursor: "pointer",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#f9f9f9",
    fontSize: 14,
    ':hover': {
      background: '#e9e9e9'
    }
  },
  title: {
    margin: 0,
    color: "#333",
    fontSize: "20px"
  },
  progressContainer: {
    marginBottom: "30px"
  },
  progressSteps: {
    display: "flex",
    justifyContent: "space-between",
    position: "relative"
  },
  progressStep: {
    flex: 1,
    textAlign: "center",
    position: "relative",
    opacity: 0.5
  },
  progressStepActive: {
    opacity: 1
  },
  stepNumber: {
    display: "block",
    width: "30px",
    height: "30px",
    lineHeight: "30px",
    borderRadius: "50%",
    backgroundColor: "#1976d2",
    color: "#fff",
    margin: "0 auto 5px",
    fontSize: "14px",
    fontWeight: "bold"
  },
  stepLabel: {
    fontSize: "12px",
    color: "#666"
  },
  card: {
    backgroundColor: "#fff",
    padding: "25px",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },
  section: {
    marginBottom: "25px",
    padding: "15px",
    backgroundColor: "#f9f9f9",
    borderRadius: 8
  },
  sectionHeader: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginBottom: "15px"
  },
  sectionIcon: {
    fontSize: "20px"
  },
  sectionTitle: {
    margin: 0,
    fontSize: "16px",
    color: "#333"
  },
  gpsIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
    padding: "8px",
    backgroundColor: "#fff",
    borderRadius: 4,
    fontSize: "13px"
  },
  gpsIcon: {
    fontSize: "14px"
  },
  locationButton: {
    width: "100%",
    padding: "14px",
    borderRadius: 8,
    border: "none",
    color: "#fff",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  buttonIcon: {
    fontSize: "18px"
  },
  locationInfo: {
    marginTop: "10px",
    padding: "10px",
    backgroundColor: "#fff",
    borderRadius: 6
  },
  infoRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "5px 0",
    borderBottom: "1px solid #f0f0f0"
  },
  infoLabel: {
    color: "#666",
    fontSize: "13px"
  },
  infoValue: {
    color: "#333",
    fontSize: "13px",
    fontWeight: "500"
  },
  message: {
    marginTop: "10px",
    padding: "10px",
    backgroundColor: "#fff",
    borderRadius: 6,
    textAlign: "center",
    fontSize: "14px"
  },
  tipsBox: {
    marginTop: "10px",
    padding: "10px",
    backgroundColor: "#fff3e0",
    borderRadius: 6,
    borderLeft: "4px solid #ed6c02"
  },
  tipsTitle: {
    margin: "0 0 5px 0",
    fontWeight: "bold",
    color: "#ed6c02",
    fontSize: "13px"
  },
  tipsList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#666",
    fontSize: "12px",
    lineHeight: "1.6"
  },
  cameraContainer: {
    position: "relative",
    marginBottom: "15px",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#000"
  },
  video: {
    width: "100%",
    height: "auto",
    display: "block"
  },
  cameraOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: "10px",
    background: "linear-gradient(transparent, rgba(0,0,0,0.7))",
    color: "#fff",
    textAlign: "center",
    fontSize: "12px"
  },
  selfieButton: {
    width: "100%",
    padding: "12px",
    borderRadius: 8,
    border: "none",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "bold",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  successMessage: {
    color: "#2e7d32",
    marginTop: "10px",
    textAlign: "center",
    fontWeight: "bold",
    fontSize: "14px"
  },
  label: {
    display: "block",
    marginBottom: "8px",
    fontWeight: 500,
    color: "#555",
    fontSize: "14px"
  },
  textarea: {
    width: "100%",
    padding: "12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: "14px",
    fontFamily: "inherit",
    resize: "vertical",
    boxSizing: "border-box"
  },
  hint: {
    display: "block",
    marginTop: "5px",
    color: "#666",
    fontSize: "12px"
  },
  submitButton: {
    width: "100%",
    padding: "16px",
    borderRadius: 8,
    border: "none",
    color: "#fff",
    fontSize: "18px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  infoBox: {
    marginTop: "20px",
    padding: "15px",
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    borderLeft: "4px solid #1976d2"
  },
  infoText: {
    margin: 0,
    color: "#0d47a1",
    fontSize: "13px",
    lineHeight: "1.5"
  },
  completedContainer: {
    maxWidth: 500,
    margin: "50px auto",
    padding: "40px",
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    textAlign: "center"
  },
  completedIcon: {
    fontSize: "64px",
    marginBottom: "20px"
  },
  completedTitle: {
    color: "#2e7d32",
    marginBottom: "10px"
  },
  completedMessage: {
    color: "#333",
    marginBottom: "5px",
    fontSize: "16px"
  },
  completedSubMessage: {
    color: "#666",
    marginBottom: "20px",
    fontSize: "14px"
  },
  dashboardButton: {
    padding: "12px 24px",
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold"
  }
};