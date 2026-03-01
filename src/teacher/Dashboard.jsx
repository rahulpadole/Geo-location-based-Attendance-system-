import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  orderBy,
  limit
} from "firebase/firestore";
import { useToast } from "../hooks/useToast";
import LoadingSpinner from "../components/LoadingSpinner";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [today, setToday] = useState("");
  const [status, setStatus] = useState("Not Marked");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalLate: 0,
    totalAbsent: 0,
    attendanceRate: 0,
    totalRecords: 0,
    lastUpdated: null
  });
  const [statsError, setStatsError] = useState(null);

  const [college, setCollege] = useState({
    lat: null,
    lng: null,
    radius: null,
    distance: null,
    isWithin: false
  });

  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    const now = new Date();
    setToday(now.toISOString().split("T")[0]);
    setUserName(auth.currentUser.displayName || auth.currentUser.email?.split('@')[0] || "Teacher");

    init();
    
    const interval = setInterval(() => {
      console.log("Auto-refreshing dashboard data...");
      refreshData();
    }, 30000);
    
    const handleAttendanceUpdate = () => {
      console.log("Attendance updated event received");
      refreshData();
    };
    
    const handleProfileUpdate = () => {
      console.log("Profile updated event received");
      loadUserProfile();
    };
    
    window.addEventListener('attendance-updated', handleAttendanceUpdate);
    window.addEventListener('profile-updated', handleProfileUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('attendance-updated', handleAttendanceUpdate);
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const init = async () => {
    await loadCollegeSettings();
    await loadUserProfile();
    await refreshData();
    setLoading(false);
  };

  const loadUserProfile = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUserName(userData.name || user.email?.split('@')[0] || "Teacher");
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    }
  };

  const refreshData = async () => {
    console.log("Refreshing dashboard data...");
    setStatsError(null);
    await Promise.all([
      checkAttendance(),
      loadRecentAttendance(),
      loadAttendanceStats()
    ]);
  };

  const loadCollegeSettings = async () => {
    try {
      const snap = await getDoc(doc(db, "collegeSettings", "main"));
      if (!snap.exists()) {
        setMessage("College settings not configured. Please contact admin.");
        return;
      }

      const data = snap.data();
      setCollege({
        lat: Number(data.latitude),
        lng: Number(data.longitude),
        radius: Number(data.radius) || 150,
      });
    } catch (err) {
      console.error(err);
      setMessage("Failed to load college settings");
    }
  };

  const checkAttendance = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const today = new Date().toISOString().split("T")[0];
      const q = query(
        collection(db, "attendance"),
        where("userId", "==", user.uid),
        where("date", "==", today)
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        const record = snap.docs[0].data();
        setStatus(record.status || "Present");
        
        if (record.outTime) {
          setMessage("✅ You have completed attendance for today");
        } else {
          setMessage("⏰ You are checked in. Don't forget to check out!");
        }
      } else {
        setStatus("Not Marked");
        setMessage("📝 Please mark your attendance");
      }
    } catch (err) {
      console.error(err);
      setStatus("Error");
    }
  };

  const loadRecentAttendance = async () => {
    try {
      const user = auth.currentUser;
      if (!user) return;
      
      const q = query(
        collection(db, "attendance"),
        where("userId", "==", user.uid),
        orderBy("date", "desc"),
        limit(5)
      );

      const snap = await getDocs(q);
      const records = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecentAttendance(records);
    } catch (err) {
      console.error("Error loading recent attendance:", err);
    }
  };

  const loadAttendanceStats = async () => {
    try {
      const user = auth.currentUser;
      if (!user) {
        console.log("No user found for stats");
        return;
      }

      // Calculate last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log("Loading stats for user:", user.uid);
      console.log("Date range:", startDateStr, "to", endDateStr);

      // Try with date range query first
      try {
        const q = query(
          collection(db, "attendance"),
          where("userId", "==", user.uid),
          where("date", ">=", startDateStr),
          where("date", "<=", endDateStr)
        );

        const snap = await getDocs(q);
        console.log("Query successful, found:", snap.size, "records");
        
        const records = snap.docs.map(doc => doc.data());
        calculateAndSetStats(records);
        
      } catch (indexError) {
        console.log("Date range query failed, trying fallback:", indexError.message);
        
        // Fallback: Get all records and filter in memory
        const allRecordsQuery = query(
          collection(db, "attendance"),
          where("userId", "==", user.uid)
        );
        
        const allSnap = await getDocs(allRecordsQuery);
        console.log("Fallback query successful, total records:", allSnap.size);
        
        const allRecords = allSnap.docs.map(doc => doc.data());
        
        // Filter in memory for last 30 days
        const filteredRecords = allRecords.filter(record => {
          return record.date >= startDateStr && record.date <= endDateStr;
        });
        
        console.log("Filtered records for last 30 days:", filteredRecords.length);
        calculateAndSetStats(filteredRecords);
      }

    } catch (err) {
      console.error("Error loading attendance stats:", err);
      setStatsError(err.message);
      showToast("Failed to load attendance statistics. Using sample data.", "warning");
      
      // Set sample data so UI doesn't break
      setStats({
        totalPresent: 0,
        totalLate: 0,
        totalAbsent: 0,
        attendanceRate: 0,
        totalRecords: 0,
        lastUpdated: new Date()
      });
    }
  };

  const calculateAndSetStats = (records) => {
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const late = records.filter(r => r.status === 'Late').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    
    const attended = present + late;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

    console.log("Stats calculated:", {
      total,
      present,
      late,
      absent,
      attended,
      rate
    });

    setStats({
      totalPresent: present,
      totalLate: late,
      totalAbsent: absent,
      attendanceRate: rate,
      totalRecords: total,
      lastUpdated: new Date()
    });
  };

  const deg2rad = (deg) => deg * (Math.PI / 180);

  const getDistanceInMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const checkLocation = () => {
    if (!navigator.geolocation) {
      showToast("Geolocation not supported", "error");
      return;
    }

    if (!college.lat || !college.lng) {
      showToast("College location not configured", "error");
      return;
    }

    setCheckingLocation(true);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const distance = getDistanceInMeters(
          pos.coords.latitude,
          pos.coords.longitude,
          college.lat,
          college.lng
        );

        const isWithin = distance <= college.radius;

        setCollege(prev => ({
          ...prev,
          distance,
          isWithin
        }));

        if (isWithin) {
          showToast(`✅ You are inside campus (${Math.round(distance)} meters)`, "success");
        } else {
          showToast(`❌ You are outside campus (${(distance/1000).toFixed(2)} km)`, "error");
        }

        setCheckingLocation(false);
      },
      (err) => {
        let errorMessage = "Location error";
        if (err.code === 1) errorMessage = "Location permission denied";
        else if (err.code === 2) errorMessage = "Location unavailable";
        else if (err.code === 3) errorMessage = "Location request timeout";
        
        showToast(errorMessage, "error");
        setCheckingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const getStatusColor = () => {
    switch(status) {
      case 'Present': return '#2e7d32';
      case 'Late': return '#ed6c02';
      case 'Absent': return '#d32f2f';
      case 'Not Marked': return '#757575';
      default: return '#757575';
    }
  };

  const getStatusIcon = () => {
    switch(status) {
      case 'Present': return '✅';
      case 'Late': return '⏰';
      case 'Absent': return '❌';
      case 'Not Marked': return '📝';
      default: return '❓';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString + 'T12:00:00');
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        weekday: 'short'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '-';
    if (timestamp?.toDate) {
      return timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return '-';
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <p style={styles.loadingText}>Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.welcomeSection}>
          <h1 style={styles.welcomeTitle}>Welcome back, {userName}! 👋</h1>
          <p style={styles.date}>{new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          {stats.lastUpdated && (
            <p style={styles.lastUpdated}>
              Last updated: {stats.lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div style={styles.statusBadge}>
          <span style={styles.statusIcon}>{getStatusIcon()}</span>
          <span style={{...styles.statusText, color: getStatusColor()}}>
            {status}
          </span>
        </div>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{stats.totalPresent}</span>
          <span style={styles.statLabel}>Present (30d)</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{stats.totalLate}</span>
          <span style={styles.statLabel}>Late (30d)</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{stats.totalAbsent}</span>
          <span style={styles.statLabel}>Absent (30d)</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statValue}>{stats.attendanceRate}%</span>
          <span style={styles.statLabel}>Attendance Rate</span>
        </div>
      </div>

      {statsError && (
        <div style={styles.errorMessage}>
          <p>⚠️ Using limited data. Some statistics may not be accurate.</p>
        </div>
      )}

      {stats.totalRecords > 0 && (
        <div style={styles.statsSummary}>
          <p>Total records in last 30 days: <strong>{stats.totalRecords}</strong></p>
        </div>
      )}

      <div style={styles.contentGrid}>
        <div style={styles.leftColumn}>
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Quick Actions</h3>
            
            <button
              onClick={() => navigate("/teacher/attendance")}
              style={styles.actionButton}
            >
              <span style={styles.actionIcon}>📍</span>
              <span style={styles.actionText}>Mark Attendance</span>
              <span style={styles.actionArrow}>→</span>
            </button>

            

            <button
              onClick={() => navigate("/teacher/history")}
              style={styles.actionButton}
            >
              <span style={styles.actionIcon}>📋</span>
              <span style={styles.actionText}>View History</span>
              <span style={styles.actionArrow}>→</span>
            </button>

            <button
              onClick={() => navigate("/teacher/profile")}
              style={styles.actionButton}
            >
              <span style={styles.actionIcon}>👤</span>
              <span style={styles.actionText}>My Profile</span>
              <span style={styles.actionArrow}>→</span>
            </button>
          </div>

          <div style={styles.card}>
            <h3 style={styles.cardTitle}>Location Status</h3>
            
            <button
              onClick={checkLocation}
              disabled={checkingLocation}
              style={styles.locationButton}
            >
              {checkingLocation ? (
                <LoadingSpinner size="small" />
              ) : (
                <>
                  <span style={styles.locationIcon}>📍</span>
                  <span>Check My Location</span>
                </>
              )}
            </button>

            {college.distance !== null && (
              <div style={styles.locationInfo}>
                <p style={styles.distance}>
                  Distance: {college.distance < 1000 
                    ? `${Math.round(college.distance)} meters` 
                    : `${(college.distance/1000).toFixed(2)} km`}
                </p>
                <p style={{
                  ...styles.campusStatus,
                  color: college.isWithin ? '#2e7d32' : '#d32f2f'
                }}>
                  {college.isWithin ? '✅ Inside Campus' : '❌ Outside Campus'}
                </p>
              </div>
            )}

            {message && (
              <p style={styles.message}>{message}</p>
            )}
          </div>
        </div>

        <div style={styles.rightColumn}>
          <div style={styles.card}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>Recent Attendance</h3>
              <button 
                onClick={() => navigate("/teacher/history")}
                style={styles.viewAllButton}
              >
                View All →
              </button>
            </div>

            {recentAttendance.length === 0 ? (
              <div style={styles.emptyState}>
                <p style={styles.emptyIcon}>📅</p>
                <p style={styles.emptyText}>No attendance records yet</p>
                <button 
                  onClick={() => navigate("/teacher/attendance")}
                  style={styles.markNowButton}
                >
                  Mark Now
                </button>
              </div>
            ) : (
              <div style={styles.attendanceList}>
                {recentAttendance.map((record) => (
                  <div key={record.id} style={styles.attendanceItem}>
                    <div style={styles.attendanceDate}>
                      <span style={styles.dateDay}>{formatDate(record.date)}</span>
                    </div>
                    <div style={styles.attendanceDetails}>
                      <div style={styles.attendanceTimes}>
                        <span style={styles.timeLabel}>In:</span>
                        <span style={styles.timeValue}>{formatTime(record.inTime)}</span>
                        <span style={styles.timeLabel}>Out:</span>
                        <span style={styles.timeValue}>{formatTime(record.outTime)}</span>
                      </div>
                      <span style={{
                        ...styles.attendanceStatus,
                        color: record.status === 'Present' ? '#2e7d32' :
                               record.status === 'Late' ? '#ed6c02' : '#d32f2f'
                      }}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={styles.tipsCard}>
            <h4 style={styles.tipsTitle}>💡 Quick Tips</h4>
            <ul style={styles.tipsList}>
              <li>Mark attendance within 150m of college</li>
              <li>Take a clear selfie for check-in</li>
<li>Don't forget to check out at end of day</li>
              <li>Provide reason if you're late</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1200,
    margin: "30px auto",
    padding: "0 20px"
  },
  loadingContainer: {
    textAlign: "center",
    padding: "60px 20px"
  },
  loadingText: {
    marginTop: "20px",
    color: "#666"
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
    padding: "20px",
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  welcomeSection: {
    flex: 1
  },
  welcomeTitle: {
    margin: "0 0 5px 0",
    color: "#333",
    fontSize: "24px"
  },
  date: {
    margin: "0 0 5px 0",
    color: "#666",
    fontSize: "14px"
  },
  lastUpdated: {
    margin: 0,
    color: "#999",
    fontSize: "12px",
    fontStyle: "italic"
  },
  statusBadge: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 20px",
    backgroundColor: "#f5f5f5",
    borderRadius: "30px"
  },
  statusIcon: {
    fontSize: "20px"
  },
  statusText: {
    fontWeight: "bold",
    fontSize: "16px"
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: "20px",
    marginBottom: "10px"
  },
  statCard: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    textAlign: "center"
  },
  statValue: {
    display: "block",
    fontSize: "28px",
    fontWeight: "bold",
    color: "#1976d2",
    marginBottom: "5px"
  },
  statLabel: {
    fontSize: "13px",
    color: "#666"
  },
  errorMessage: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    padding: "10px 15px",
    borderRadius: 8,
    marginBottom: "20px",
    fontSize: "14px",
    border: "1px solid #ffcdd2"
  },
  statsSummary: {
    backgroundColor: "#e3f2fd",
    padding: "10px 15px",
    borderRadius: 8,
    marginBottom: "20px",
    fontSize: "14px",
    color: "#1976d2"
  },
  contentGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr",
    gap: "20px"
  },
  leftColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  rightColumn: {
    display: "flex",
    flexDirection: "column",
    gap: "20px"
  },
  card: {
    backgroundColor: "#fff",
    padding: "20px",
    borderRadius: "12px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "15px"
  },
  cardTitle: {
    margin: 0,
    color: "#333",
    fontSize: "18px"
  },
  viewAllButton: {
    padding: "5px 10px",
    backgroundColor: "transparent",
    border: "1px solid #1976d2",
    borderRadius: "4px",
    color: "#1976d2",
    cursor: "pointer",
    fontSize: "12px"
  },
  actionButton: {
    display: "flex",
    alignItems: "center",
    width: "100%",
    padding: "15px",
    marginBottom: "10px",
    backgroundColor: "#f5f5f5",
    border: "1px solid #eee",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "all 0.2s"
  },
  actionIcon: {
    fontSize: "20px",
    marginRight: "12px"
  },
  actionText: {
    flex: 1,
    textAlign: "left",
    fontSize: "14px",
    fontWeight: "500",
    color: "#333"
  },
  actionArrow: {
    color: "#999",
    fontSize: "16px"
  },
  locationButton: {
    width: "100%",
    padding: "15px",
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px"
  },
  locationIcon: {
    fontSize: "18px"
  },
  locationInfo: {
    marginTop: "15px",
    padding: "15px",
    backgroundColor: "#f5f5f5",
    borderRadius: "8px"
  },
  distance: {
    margin: "0 0 5px 0",
    fontSize: "14px",
    color: "#666"
  },
  campusStatus: {
    margin: 0,
    fontWeight: "bold",
    fontSize: "14px"
  },
  message: {
    marginTop: "15px",
    padding: "10px",
    backgroundColor: "#e3f2fd",
    borderRadius: "6px",
    fontSize: "13px",
    color: "#1976d2"
  },
  emptyState: {
    textAlign: "center",
    padding: "30px 20px"
  },
  emptyIcon: {
    fontSize: "40px",
    marginBottom: "10px",
    opacity: 0.5
  },
  emptyText: {
    color: "#999",
    marginBottom: "15px"
  },
  markNowButton: {
    padding: "8px 20px",
    backgroundColor: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer"
  },
  attendanceList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px"
  },
  attendanceItem: {
    padding: "12px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    border: "1px solid #eee"
  },
  attendanceDate: {
    marginBottom: "5px"
  },
  dateDay: {
    fontWeight: "bold",
    color: "#333",
    fontSize: "13px"
  },
  attendanceDetails: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },
  attendanceTimes: {
    display: "flex",
    alignItems: "center",
    gap: "8px"
  },
  timeLabel: {
    fontSize: "12px",
    color: "#999"
  },
  timeValue: {
    fontSize: "13px",
    color: "#333",
    fontWeight: "500"
  },
  attendanceStatus: {
    fontSize: "12px",
    fontWeight: "bold",
    padding: "3px 8px",
    backgroundColor: "#fff",
    borderRadius: "12px"
  },
  tipsCard: {
    backgroundColor: "#e8f5e8",
    padding: "20px",
    borderRadius: "12px",
    border: "1px solid #c8e6c9"
  },
  tipsTitle: {
    margin: "0 0 10px 0",
    color: "#2e7d32",
    fontSize: "16px"
  },
  tipsList: {
    margin: 0,
    paddingLeft: "20px",
    color: "#1b5e20",
    fontSize: "13px",
    lineHeight: "1.8"
  }
};