import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { useState, useEffect } from "react";

export default function Navbar({ role }) {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    if (auth.currentUser) {
      setUserEmail(auth.currentUser.email);
    }
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate("/login");
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.logo}>
        <h3>Geo Attendance</h3>
      </div>

      <ul style={styles.menu}>
        {role === "teacher" && (
          <>
            <li><Link to="/teacher/dashboard">Dashboard</Link></li>
            <li><Link to="/teacher/attendance">Mark Attendance</Link></li>
            <li><Link to="/teacher/leave">Mark Leave</Link></li>
            <li><Link to="/teacher/history">History</Link></li>
            <li><Link to="/teacher/profile">Profile</Link></li>
          </>
        )}

        {role === "admin" && (
          <>
            <li><Link to="/admin/dashboard">Dashboard</Link></li>
            <li><Link to="/admin/college-settings">College Settings</Link></li>
            <li><Link to="/admin/holidays">Holidays</Link></li>
            <li><Link to="/admin/teachers">Teachers</Link></li>
            <li><Link to="/admin/attendance">Attendance Records</Link></li>
            <li><Link to="/admin/export">Export</Link></li>
            <li><Link to="/admin/audit-logs">Audit Logs</Link></li>
            <li><Link to="/admin/profile">Profile</Link></li>
          </>
        )}

        <li style={{ marginLeft: "20px", color: "#fff" }}>
          {userEmail}
        </li>
        <li>
          <button style={styles.logoutBtn} onClick={handleLogout}>
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
}

const styles = {
  nav: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    background: "#1976d2",
    padding: "10px 20px",
    color: "#fff",
    flexWrap: "wrap",
  },
  logo: { fontWeight: "bold" },
  menu: { display: "flex", listStyle: "none", alignItems: "center", gap: "15px", margin: 0, padding: 0 },
  logoutBtn: {
    background: "#ff4d4f",
    border: "none",
    padding: "5px 10px",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
  },
};
