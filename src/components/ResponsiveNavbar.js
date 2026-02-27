import { Link, useNavigate } from "react-router-dom";
import { auth } from "../services/firebase";
import { useState, useEffect } from "react";

export default function ResponsiveNavbar({ role }) {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    if (auth.currentUser) {
      setUserEmail(auth.currentUser.email);
    }

    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth > 768) {
        setMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const isMobile = windowWidth <= 768;

  const teacherMenuItems = [
    { to: "/teacher/dashboard", label: "Dashboard" },
    { to: "/teacher/attendance", label: "Mark Attendance" },
    { to: "/teacher/leave", label: "Mark Leave" },
    { to: "/teacher/history", label: "History" },
    { to: "/teacher/profile", label: "Profile" }
  ];

  const adminMenuItems = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/college-settings", label: "College Settings" },
    { to: "/admin/holidays", label: "Holidays" },
    { to: "/admin/teachers", label: "Teachers" },
    { to: "/admin/attendance", label: "Attendance Records" },
    { to: "/admin/export", label: "Export" },
    { to: "/admin/audit-logs", label: "Audit Logs" },
    { to: "/admin/profile", label: "Profile" }
  ];

  const menuItems = role === "teacher" ? teacherMenuItems : adminMenuItems;

  return (
    <nav style={styles.nav}>
      <div style={styles.navContainer}>
        <div style={styles.logo}>
          <h3 style={styles.logoText}>📍 Geo Attendance</h3>
        </div>

        {/* Desktop Menu */}
        {!isMobile && (
          <ul style={styles.menu}>
            {menuItems.map((item) => (
              <li key={item.to} style={styles.menuItem}>
                <Link to={item.to} style={styles.link}>
                  {item.label}
                </Link>
              </li>
            ))}
            <li style={styles.userInfo}>
              <span style={styles.userEmail}>{userEmail}</span>
            </li>
            <li>
              <button style={styles.logoutBtn} onClick={handleLogout}>
                Logout
              </button>
            </li>
          </ul>
        )}

        {/* Mobile Menu Button */}
        {isMobile && (
          <button 
            onClick={toggleMenu}
            style={styles.menuButton}
            aria-label="Toggle menu"
          >
            <span style={styles.hamburgerIcon}>
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
              <span style={styles.hamburgerLine}></span>
            </span>
          </button>
        )}
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobile && menuOpen && (
        <div style={styles.mobileMenu}>
          <ul style={styles.mobileMenuList}>
            {menuItems.map((item) => (
              <li key={item.to} style={styles.mobileMenuItem}>
                <Link 
                  to={item.to} 
                  style={styles.mobileLink}
                  onClick={closeMenu}
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li style={styles.mobileUserInfo}>
              <span style={styles.mobileUserEmail}>{userEmail}</span>
            </li>
            <li style={styles.mobileMenuItem}>
              <button 
                style={styles.mobileLogoutBtn} 
                onClick={() => {
                  handleLogout();
                  closeMenu();
                }}
              >
                Logout
              </button>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    background: "#1976d2",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    width: "100%"
  },
  navContainer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px 20px",
    maxWidth: 1200,
    margin: "0 auto"
  },
  logo: {
    display: "flex",
    alignItems: "center"
  },
  logoText: {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: "bold"
  },
  menu: {
    display: "flex",
    listStyle: "none",
    alignItems: "center",
    gap: "20px",
    margin: 0,
    padding: 0,
    flexWrap: "wrap"
  },
  menuItem: {
    padding: "5px 0"
  },
  link: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "14px",
    padding: "5px 10px",
    borderRadius: 4,
    transition: "background-color 0.3s",
    cursor: "pointer",
    display: "inline-block",
    ":hover": {
      backgroundColor: "rgba(255,255,255,0.1)"
    }
  },
  userInfo: {
    marginLeft: "20px",
    borderLeft: "1px solid rgba(255,255,255,0.3)",
    paddingLeft: "20px"
  },
  userEmail: {
    fontSize: "14px",
    color: "#fff",
    opacity: 0.9
  },
  logoutBtn: {
    background: "#d32f2f",
    border: "none",
    padding: "8px 16px",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "14px",
    fontWeight: "bold",
    minHeight: "40px",
    minWidth: "80px",
    transition: "background-color 0.3s",
    ":hover": {
      backgroundColor: "#b71c1c"
    }
  },
  menuButton: {
    background: "transparent",
    border: "none",
    color: "#fff",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "8px",
    minHeight: "44px",
    minWidth: "44px",
    borderRadius: "4px",
    ":hover": {
      backgroundColor: "rgba(255,255,255,0.1)"
    }
  },
  hamburgerIcon: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-around",
    width: "24px",
    height: "24px"
  },
  hamburgerLine: {
    width: "24px",
    height: "3px",
    backgroundColor: "#fff",
    borderRadius: "3px",
    margin: "2px 0"
  },
  mobileMenu: {
    position: "absolute",
    top: "100%",
    left: 0,
    right: 0,
    backgroundColor: "#1976d2",
    padding: "20px",
    boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
    borderTop: "1px solid rgba(255,255,255,0.1)",
    maxHeight: "calc(100vh - 60px)",
    overflowY: "auto"
  },
  mobileMenuList: {
    listStyle: "none",
    margin: 0,
    padding: 0
  },
  mobileMenuItem: {
    marginBottom: "15px"
  },
  mobileLink: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "16px",
    display: "block",
    padding: "12px",
    borderRadius: "4px",
    backgroundColor: "rgba(255,255,255,0.1)",
    transition: "background-color 0.3s",
    cursor: "pointer",
    minHeight: "44px",
    display: "flex",
    alignItems: "center",
    ":hover": {
      backgroundColor: "rgba(255,255,255,0.2)"
    }
  },
  mobileUserInfo: {
    borderTop: "1px solid rgba(255,255,255,0.2)",
    marginTop: "10px",
    paddingTop: "15px",
    marginBottom: "10px"
  },
  mobileUserEmail: {
    color: "#fff",
    fontSize: "14px",
    display: "block",
    padding: "8px 12px",
    opacity: 0.9
  },
  mobileLogoutBtn: {
    width: "100%",
    background: "#d32f2f",
    border: "none",
    padding: "14px",
    color: "#fff",
    cursor: "pointer",
    borderRadius: "4px",
    fontSize: "16px",
    fontWeight: "bold",
    minHeight: "44px",
    transition: "background-color 0.3s",
    ":hover": {
      backgroundColor: "#b71c1c"
    }
  }
};