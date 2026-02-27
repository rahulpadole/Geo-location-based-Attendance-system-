import { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  getDoc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { db } from "../services/firebase";
import ResetDatabaseButton from '../components/ResetDatabase';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const [totalTeachers, setTotalTeachers] = useState(0);
  const [totalAdmins, setTotalAdmins] = useState(0);
  const [todayPresent, setTodayPresent] = useState(0);
  const [lateCount, setLateCount] = useState(0);
  const [collegeStatus, setCollegeStatus] = useState("Checking...");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setError(null);
      
      /* ------------------ TOTAL TEACHERS ------------------ */
      const teacherSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "teacher"))
      );
      setTotalTeachers(teacherSnap.size);

      /* ------------------ TOTAL ADMINS ------------------ */
      const adminSnap = await getDocs(
        query(collection(db, "users"), where("role", "==", "admin"))
      );
      setTotalAdmins(adminSnap.size);

      /* ------------------ TODAY ATTENDANCE ------------------ */
      const today = new Date().toISOString().split("T")[0];
      const attendanceSnap = await getDocs(
        query(collection(db, "attendance"), where("date", "==", today))
      );

      let present = 0;
      let late = 0;

      attendanceSnap.forEach((doc) => {
        const data = doc.data();
        if (data.status === "Present") present++;
        if (data.lateReason && data.lateReason.trim() !== "") late++;
      });

      setTodayPresent(present);
      setLateCount(late);

      /* ------------------ COLLEGE LOCATION STATUS ------------------ */
      const collegeSnap = await getDoc(doc(db, "collegeSettings", "main"));

      if (!collegeSnap.exists()) {
        setCollegeStatus("Location Not Set ❌");
      } else {
        const { latitude, longitude, radius } = collegeSnap.data();
        if (latitude && longitude && radius) {
          setCollegeStatus("Location Configured ✅");
        } else {
          setCollegeStatus("Incomplete Location ❌");
        }
      }
    } catch (error) {
      console.error("Admin Dashboard Error:", error);
      setCollegeStatus("Error Loading ❌");
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadDashboardData();
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <p style={styles.loadingText}>Loading Dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.errorContainer}>
        <h3 style={styles.errorTitle}>❌ Error Loading Dashboard</h3>
        <p style={styles.errorMessage}>{error}</p>
        <button onClick={handleRefresh} style={styles.retryButton}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>Admin Dashboard</h2>
        <button onClick={handleRefresh} style={styles.refreshButton}>
          🔄 Refresh
        </button>
      </div>

      {/* ------------------ STATS ------------------ */}
      <div style={styles.statsGrid}>
        <StatCard title="Total Teachers" value={totalTeachers} icon="👥" />
        <StatCard title="Total Admins" value={totalAdmins} icon="👤" />
        <StatCard title="Today Present" value={todayPresent} icon="✅" />
        <StatCard title="Late Arrivals" value={lateCount} icon="⏰" />
        <StatCard title="College Location" value={collegeStatus} icon="📍" />
      </div>

      {/* ------------------ ACTIONS ------------------ */}
      <div style={styles.actionsSection}>
        <h3 style={styles.sectionTitle}>Quick Actions</h3>
        <div style={styles.actionsGrid}>
          <ActionButton
            text="➕ Add New Admin"
            onClick={() => navigate("/admin/admin-form")}
            highlight
          />

          <ActionButton
            text="⚙️ College Settings"
            onClick={() => navigate("/admin/college-settings")}
          />

          <ActionButton
            text="📅 Timetable"
            onClick={() => navigate("/admin/timetable")}
          />

          <ActionButton
            text="👨‍🏫 Teachers"
            onClick={() => navigate("/admin/teachers")}
          />

          <ActionButton
            text="📋 Attendance Records"
            onClick={() => navigate("/admin/attendance")}
          />

          <ActionButton
            text="📊 Export Data"
            onClick={() => navigate("/admin/export")}
          />

          <ActionButton
            text="📜 Audit Logs"
            onClick={() => navigate("/admin/audit-logs")}
          />

          <ActionButton
            text="👤 My Profile"
            onClick={() => navigate("/admin/profile")}
          />
        </div>
      </div>

      {/* ------------------ DANGER ZONE ------------------ */}
      {/* <div style={styles.dangerZone}>
        <h3 style={styles.dangerTitle}>⚠️ Danger Zone</h3>
        <div style={styles.dangerActions}>
          <ResetDatabaseButton />
        </div>
      </div> */}
    </div>
  );
}

/* ------------------ UI COMPONENTS ------------------ */

function StatCard({ title, value, icon }) {
  return (
    <div style={styles.statCard}>
      <div style={styles.statHeader}>
        <span style={styles.statIcon}>{icon}</span>
        <h4 style={styles.statTitle}>{title}</h4>
      </div>
      <p style={styles.statValue}>{value}</p>
    </div>
  );
}

function ActionButton({ text, onClick, highlight = false }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.actionButton,
        backgroundColor: highlight ? "#2e7d32" : "#1976d2",
      }}
      onMouseOver={(e) => (e.target.style.opacity = "0.9")}
      onMouseOut={(e) => (e.target.style.opacity = "1")}
      onFocus={(e) => (e.target.style.opacity = "0.9")}
      onBlur={(e) => (e.target.style.opacity = "1")}
    >
      {text}
    </button>
  );
}

/* ------------------ STYLES ------------------ */

const styles = {
  container: {
    maxWidth: 1200,
    margin: "40px auto",
    padding: 20,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    textAlign: "center",
    margin: 0,
    color: "#333",
    fontSize: "2rem",
  },
  refreshButton: {
    padding: "8px 16px",
    backgroundColor: "#f5f5f5",
    border: "1px solid #ddd",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
    color: "#666",
    transition: "all 0.3s ease",
    minHeight: 40,
    minWidth: 100,
  },
  loadingContainer: {
    textAlign: "center",
    marginTop: 100,
  },
  loadingText: {
    marginTop: 20,
    color: "#666",
    fontSize: 16,
  },
  errorContainer: {
    textAlign: "center",
    marginTop: 100,
    padding: 40,
    backgroundColor: "#ffebee",
    borderRadius: 12,
    maxWidth: 500,
    margin: "100px auto",
  },
  errorTitle: {
    color: "#d32f2f",
    marginBottom: 10,
  },
  errorMessage: {
    color: "#666",
    marginBottom: 20,
  },
  retryButton: {
    padding: "10px 20px",
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 20,
    marginBottom: 40,
  },
  statCard: {
    border: "1px solid #e0e0e0",
    padding: 24,
    borderRadius: 16,
    textAlign: "center",
    background: "#fff",
    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
    transition: "transform 0.3s ease, boxShadow 0.3s ease",
    ':hover': {
      transform: "translateY(-2px)",
      boxShadow: "0 6px 16px rgba(0,0,0,0.1)",
    },
  },
  statHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginBottom: 15,
  },
  statIcon: {
    fontSize: 24,
  },
  statTitle: {
    margin: 0,
    color: "#666",
    fontSize: 14,
    fontWeight: "normal",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "bold",
    margin: 0,
    color: "#1976d2",
  },
  actionsSection: {
    marginTop: 40,
    padding: 30,
    backgroundColor: "#f8f9fa",
    borderRadius: 16,
  },
  sectionTitle: {
    margin: "0 0 20px 0",
    color: "#333",
    fontSize: "1.5rem",
  },
  actionsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 15,
  },
  actionButton: {
    padding: "14px 18px",
    borderRadius: 10,
    border: "none",
    cursor: "pointer",
    color: "#fff",
    fontWeight: "bold",
    minWidth: 200,
    transition: "all 0.3s ease",
    fontSize: 14,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    ':hover': {
      transform: "translateY(-1px)",
      boxShadow: "0 4px 8px rgba(0,0,0,0.15)",
    },
  },
  dangerZone: {
    marginTop: 40,
    padding: 30,
    backgroundColor: "#fff3e0",
    borderRadius: 16,
    border: "1px solid #ffb74d",
  },
  dangerTitle: {
    margin: "0 0 20px 0",
    color: "#d32f2f",
    fontSize: "1.2rem",
  },
  dangerActions: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
};

// This file already has default export at the top
// export default AdminDashboard; is already present