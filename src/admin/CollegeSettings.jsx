import { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import LoadingSpinner from "../components/LoadingSpinner";

export default function CollegeSettings() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [radius, setRadius] = useState(150);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);

  // Load existing settings
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, "collegeSettings", "main"));
      if (snap.exists()) {
        const data = snap.data();
        setLat(data.latitude?.toString() || "");
        setLng(data.longitude?.toString() || "");
        setRadius(data.radius || 150);
        showToast("Settings loaded successfully", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load college settings", "error");
    } finally {
      setLoading(false);
    }
  };

  // Save settings
  const saveSettings = async () => {
    if (!lat || !lng) {
      showToast("Latitude & Longitude are required", "error");
      return;
    }

    // Validate coordinates
    const latNum = Number(lat);
    const lngNum = Number(lng);
    const radiusNum = Number(radius);

    if (latNum < -90 || latNum > 90) {
      showToast("Latitude must be between -90 and 90", "error");
      return;
    }

    if (lngNum < -180 || lngNum > 180) {
      showToast("Longitude must be between -180 and 180", "error");
      return;
    }

    if (radiusNum < 10 || radiusNum > 1000) {
      showToast("Radius must be between 10 and 1000 meters", "error");
      return;
    }

    setSaving(true);
    try {
      await setDoc(doc(db, "collegeSettings", "main"), {
        latitude: latNum,
        longitude: lngNum,
        radius: radiusNum,
        updatedAt: new Date(),
        updatedBy: "admin"
      });

      showToast("✅ College location saved successfully", "success");
      
      // Log to audit
      await setDoc(doc(db, "auditLogs", `settings_${Date.now()}`), {
        action: "COLLEGE_SETTINGS_UPDATED",
        timestamp: new Date(),
        details: { latitude: latNum, longitude: lngNum, radius: radiusNum }
      });

    } catch (err) {
      console.error(err);
      showToast("❌ Error saving college location", "error");
    } finally {
      setSaving(false);
    }
  };

  // Use browser location
  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported by your browser", "error");
      return;
    }

    setGettingLocation(true);
    showToast("Getting your current location...", "info");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGettingLocation(false);
        showToast("Location captured successfully", "success");
      },
      (err) => {
        console.error(err);
        let errorMessage = "Failed to get location";
        if (err.code === 1) errorMessage = "Location permission denied";
        else if (err.code === 2) errorMessage = "Location unavailable";
        else if (err.code === 3) errorMessage = "Location request timeout";
        
        showToast(errorMessage, "error");
        setGettingLocation(false);
      },
      { 
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <p>Loading settings...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button 
        onClick={() => navigate(-1)} 
        style={styles.backButton}
      >
        ← Back
      </button>
      
      <h2 style={styles.title}>College Location Settings</h2>

      <div style={styles.card}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Latitude *</label>
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            placeholder="e.g., 37.774929"
            style={styles.input}
            disabled={saving}
          />
          <small style={styles.hint}>Range: -90 to 90</small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Longitude *</label>
          <input
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            placeholder="e.g., -122.419418"
            style={styles.input}
            disabled={saving}
          />
          <small style={styles.hint}>Range: -180 to 180</small>
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Allowed Radius (meters) *</label>
          <input
            type="number"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            min="10"
            max="1000"
            style={styles.input}
            disabled={saving}
          />
          <small style={styles.hint}>Recommended: 100-200 meters</small>
        </div>

        <button 
          onClick={useCurrentLocation} 
          disabled={gettingLocation || saving}
          style={{
            ...styles.locationButton,
            opacity: gettingLocation ? 0.7 : 1
          }}
        >
          {gettingLocation ? (
            <LoadingSpinner size="small" />
          ) : (
            "📍 Use My Current Location"
          )}
        </button>

        <div style={styles.buttonGroup}>
          <button 
            onClick={saveSettings} 
            disabled={saving || gettingLocation}
            style={styles.saveButton}
          >
            {saving ? <LoadingSpinner size="small" /> : "💾 Save Settings"}
          </button>
          
          <button 
            onClick={loadSettings} 
            disabled={saving}
            style={styles.resetButton}
          >
            ↩️ Reset
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div style={styles.infoBox}>
        <h4 style={styles.infoTitle}>ℹ️ About College Location</h4>
        <p style={styles.infoText}>
          The college location is used to verify that teachers are within the campus when marking attendance.
          Teachers must be within the specified radius to mark attendance.
        </p>
        <p style={styles.infoText}>
          <strong>Current settings will affect:</strong>
        </p>
        <ul style={styles.infoList}>
          <li>📍 Location verification for all teachers</li>
          <li>⏰ Late arrival detection</li>
          <li>📊 Attendance accuracy</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 500,
    margin: "30px auto",
    padding: "0 20px"
  },
  loadingContainer: {
    textAlign: "center",
    padding: "50px",
    color: "#666"
  },
  backButton: {
    marginBottom: 20,
    padding: "8px 16px",
    cursor: "pointer",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#f9f9f9",
    fontSize: 14
  },
  title: {
    textAlign: "center",
    marginBottom: 30,
    color: "#333"
  },
  card: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },
  formGroup: {
    marginBottom: 20
  },
  label: {
    display: "block",
    marginBottom: 5,
    fontWeight: 500,
    color: "#555"
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    boxSizing: "border-box"
  },
  hint: {
    display: "block",
    marginTop: 3,
    color: "#666",
    fontSize: 12
  },
  locationButton: {
    width: "100%",
    padding: "12px",
    marginBottom: 15,
    backgroundColor: "#4caf50",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
    minHeight: "44px"
  },
  buttonGroup: {
    display: "flex",
    gap: 10
  },
  saveButton: {
    flex: 2,
    padding: "12px",
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
    minHeight: "44px"
  },
  resetButton: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#f5f5f5",
    border: "1px solid #ddd",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
    minHeight: "44px"
  },
  infoBox: {
    marginTop: 30,
    padding: 20,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    borderLeft: "4px solid #1976d2"
  },
  infoTitle: {
    margin: "0 0 10px 0",
    color: "#1976d2"
  },
  infoText: {
    margin: "5px 0",
    color: "#333",
    fontSize: 14,
    lineHeight: 1.6
  },
  infoList: {
    margin: "10px 0 0 20px",
    color: "#333",
    fontSize: 14
  }
};