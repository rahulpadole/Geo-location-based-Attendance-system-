import { auth, db } from "../services/firebase";
import { signOut, updatePassword, updateEmail, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import LoadingSpinner from "../components/LoadingSpinner";

export default function AdminProfile() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [stats, setStats] = useState({
    totalTeachers: 0,
    totalAdmins: 0
  });

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Edit profile state
  const [editForm, setEditForm] = useState({
    name: "",
    designation: "",
    department: "",
    phone: "",
    adminId: ""
  });

  useEffect(() => {
    loadProfile();
    loadStats();
  }, []);

  const loadProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigate("/login");
        return;
      }

      console.log("Loading profile for UID:", currentUser.uid);
      
      const snap = await getDoc(doc(db, "users", currentUser.uid));
      if (snap.exists()) {
        const userData = snap.data();
        console.log("User data loaded:", userData);
        
        // Verify role is admin
        if (userData.role !== "admin") {
          showToast("Invalid user role", "error");
          await signOut(auth);
          navigate("/login");
          return;
        }

        setUser({
          uid: currentUser.uid,
          email: currentUser.email,
          ...userData
        });

        // Set edit form with current data
        setEditForm({
          name: userData.name || "",
          designation: userData.designation || "",
          department: userData.department || "",
          phone: userData.phone || "",
          adminId: userData.adminId || ""
        });
      } else {
        showToast("User data not found", "error");
        await signOut(auth);
        navigate("/login");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      showToast("Failed to load profile", "error");
    }
  };

  const loadStats = async () => {
    try {
      // Count teachers
      const teachersQuery = query(
        collection(db, "users"),
        where("role", "==", "teacher")
      );
      const teachersSnap = await getDocs(teachersQuery);
      
      // Count admins
      const adminsQuery = query(
        collection(db, "users"),
        where("role", "==", "admin")
      );
      const adminsSnap = await getDocs(adminsQuery);

      setStats({
        totalTeachers: teachersSnap.size,
        totalAdmins: adminsSnap.size
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  // Validate password
  const validatePassword = () => {
    if (!currentPassword) {
      showToast("Current password is required", "error");
      return false;
    }
    if (newPassword.length < 6) {
      showToast("New password must be at least 6 characters", "error");
      return false;
    }
    if (newPassword !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return false;
    }
    if (newPassword === currentPassword) {
      showToast("New password must be different from current", "error");
      return false;
    }
    return true;
  };

  // Change password
  const changePassword = async () => {
    if (!validatePassword()) return;

    setLoading(true);
    try {
      const user = auth.currentUser;
      
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      await updatePassword(user, newPassword);
      
      await updateDoc(doc(db, "users", user.uid), {
        passwordLastChanged: new Date(),
        updatedAt: new Date()
      });
      
      showToast("✅ Password updated successfully", "success");
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
      
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/wrong-password') {
        showToast("Current password is incorrect", "error");
      } else {
        showToast("Error: " + err.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Validate edit form
  const validateEditForm = () => {
    if (!editForm.name.trim()) {
      showToast("Name is required", "error");
      return false;
    }
    if (!editForm.adminId.trim()) {
      showToast("Admin ID is required", "error");
      return false;
    }
    return true;
  };

  // Update profile
  const updateProfile = async () => {
    if (!validateEditForm()) return;

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      
      // Update Firestore
      await updateDoc(doc(db, "users", currentUser.uid), {
        name: editForm.name.trim(),
        designation: editForm.designation.trim(),
        department: editForm.department.trim(),
        phone: editForm.phone.trim(),
        adminId: editForm.adminId.trim(),
        updatedAt: new Date()
      });

      // Update local state
      setUser(prev => ({
        ...prev,
        name: editForm.name.trim(),
        designation: editForm.designation.trim(),
        department: editForm.department.trim(),
        phone: editForm.phone.trim(),
        adminId: editForm.adminId.trim()
      }));

      showToast("✅ Profile updated successfully", "success");
      setShowEditForm(false);
      
    } catch (err) {
      console.error(err);
      showToast("Error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  // Handle edit form changes
  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  // Logout
  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      showToast("Failed to logout", "error");
    }
  };

  if (!user) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>
        ← Back to Dashboard
      </button>

      <div style={styles.header}>
        <div style={styles.avatar}>
          {user.name?.charAt(0) || user.email?.charAt(0) || "A"}
        </div>
        <div style={styles.headerInfo}>
          <h2 style={styles.name}>{user.name || "Admin User"}</h2>
          <p style={styles.email}>{user.email}</p>
          <span style={styles.roleBadge}>Administrator</span>
        </div>
      </div>

      <div style={styles.grid}>
        {/* Profile Details Card */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Profile Details</h3>
            {!showEditForm && (
              <button 
                onClick={() => setShowEditForm(true)}
                style={styles.editButton}
                title="Edit Profile"
              >
                ✏️ Edit
              </button>
            )}
          </div>
          
          {!showEditForm ? (
            // View Mode
            <>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Admin ID</span>
                <span style={styles.detailValue}>{user.adminId || "ADMIN" + user.uid?.slice(0,4).toUpperCase()}</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Name</span>
                <span style={styles.detailValue}>{user.name || "-"}</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Email</span>
                <span style={styles.detailValue}>{user.email}</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Role</span>
                <span style={styles.detailValue}>Administrator</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Designation</span>
                <span style={styles.detailValue}>{user.designation || "Administrator"}</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Department</span>
                <span style={styles.detailValue}>{user.department || "Administration"}</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Phone</span>
                <span style={styles.detailValue}>{user.phone || "Not set"}</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Account Status</span>
                <span style={{
                  ...styles.detailValue,
                  color: user.isActive ? '#2e7d32' : '#d32f2f',
                  fontWeight: 'bold'
                }}>
                  {user.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Member Since</span>
                <span style={styles.detailValue}>
                  {user.createdAt ? new Date(user.createdAt.toDate?.() || user.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                </span>
              </div>
            </>
          ) : (
            // Edit Mode
            <div style={styles.editForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Admin ID *</label>
                <input
                  type="text"
                  name="adminId"
                  value={editForm.adminId}
                  onChange={handleEditChange}
                  style={styles.input}
                  placeholder="Enter admin ID"
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Name *</label>
                <input
                  type="text"
                  name="name"
                  value={editForm.name}
                  onChange={handleEditChange}
                  style={styles.input}
                  placeholder="Enter full name"
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Designation</label>
                <input
                  type="text"
                  name="designation"
                  value={editForm.designation}
                  onChange={handleEditChange}
                  style={styles.input}
                  placeholder="e.g., Chief Administrator"
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Department</label>
                <input
                  type="text"
                  name="department"
                  value={editForm.department}
                  onChange={handleEditChange}
                  style={styles.input}
                  placeholder="e.g., Administration"
                  disabled={loading}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Phone</label>
                <input
                  type="tel"
                  name="phone"
                  value={editForm.phone}
                  onChange={handleEditChange}
                  style={styles.input}
                  placeholder="+1234567890"
                  disabled={loading}
                />
              </div>

              <div style={styles.buttonRow}>
                <button
                  onClick={updateProfile}
                  disabled={loading}
                  style={styles.saveButton}
                >
                  {loading ? <LoadingSpinner size="small" /> : "Save Changes"}
                </button>
                
                <button
                  onClick={() => {
                    setShowEditForm(false);
                    // Reset form to original values
                    setEditForm({
                      name: user.name || "",
                      designation: user.designation || "",
                      department: user.department || "",
                      phone: user.phone || "",
                      adminId: user.adminId || ""
                    });
                  }}
                  style={styles.cancelButton}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Quick Stats Card */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>System Overview</h3>
          
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.totalTeachers}</span>
              <span style={styles.statLabel}>Teachers</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.totalAdmins}</span>
              <span style={styles.statLabel}>Admins</span>
            </div>
          </div>

          <div style={styles.buttonGroup}>
            <button
              onClick={() => navigate("/admin/teachers")}
              style={styles.actionButton}
            >
              👥 Manage Teachers
            </button>
            
            <button
              onClick={() => navigate("/admin/college-settings")}
              style={styles.actionButton}
            >
              ⚙️ College Settings
            </button>
            
            <button
              onClick={() => navigate("/admin/holidays")}
              style={styles.actionButton}
            >
              🎉 Holidays
            </button>
          </div>
        </div>

        {/* Account Settings Card */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Account Settings</h3>
          
          {!showPasswordForm ? (
            <button
              onClick={() => setShowPasswordForm(true)}
              style={styles.actionButton}
            >
              🔒 Change Password
            </button>
          ) : (
            <div style={styles.passwordForm}>
              <h4 style={styles.formTitle}>Change Password</h4>
              
              <input
                type="password"
                placeholder="Current Password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
              
              <input
                type="password"
                placeholder="New Password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
              
              <input
                type="password"
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={styles.input}
                disabled={loading}
              />
              
              <div style={styles.buttonRow}>
                <button
                  onClick={changePassword}
                  disabled={loading}
                  style={styles.saveButton}
                >
                  {loading ? <LoadingSpinner size="small" /> : "Update"}
                </button>
                
                <button
                  onClick={() => {
                    setShowPasswordForm(false);
                    setCurrentPassword("");
                    setNewPassword("");
                    setConfirmPassword("");
                  }}
                  style={styles.cancelButton}
                  disabled={loading}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <button
            onClick={logout}
            style={{...styles.actionButton, ...styles.logoutButton}}
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div style={styles.infoBox}>
        <p style={styles.infoText}>
          <strong>🔒 Security Tip:</strong> Change your password regularly and never share it with anyone.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1000,
    margin: "30px auto",
    padding: "0 20px"
  },
  loadingContainer: {
    textAlign: "center",
    padding: "60px 20px"
  },
  backButton: {
    padding: "8px 16px",
    marginBottom: 20,
    cursor: "pointer",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#f9f9f9",
    fontSize: 14,
    ':hover': {
      background: '#e9e9e9'
    }
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    marginBottom: 30,
    padding: 20,
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    backgroundColor: "#1976d2",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 32,
    fontWeight: "bold"
  },
  headerInfo: {
    flex: 1
  },
  name: {
    margin: 0,
    color: "#333",
    fontSize: 24
  },
  email: {
    margin: "5px 0",
    color: "#666"
  },
  roleBadge: {
    display: "inline-block",
    padding: "4px 12px",
    backgroundColor: "#e3f2fd",
    color: "#1976d2",
    borderRadius: 16,
    fontSize: 12,
    fontWeight: "bold"
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
    gap: 20,
    marginBottom: 20
  },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    borderBottom: "2px solid #1976d2",
    paddingBottom: 8
  },
  cardTitle: {
    margin: 0,
    color: "#333"
  },
  editButton: {
    padding: "4px 8px",
    backgroundColor: "transparent",
    border: "1px solid #1976d2",
    borderRadius: 4,
    color: "#1976d2",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: "bold"
  },
  detailRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #f0f0f0"
  },
  detailLabel: {
    color: "#666",
    fontWeight: 500,
    minWidth: 120
  },
  detailValue: {
    color: "#333",
    textAlign: "right",
    flex: 1
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 10,
    marginBottom: 15
  },
  statItem: {
    textAlign: "center",
    padding: 15,
    backgroundColor: "#f5f5f5",
    borderRadius: 8
  },
  statValue: {
    display: "block",
    fontSize: 28,
    fontWeight: "bold",
    color: "#1976d2"
  },
  statLabel: {
    fontSize: 12,
    color: "#666"
  },
  buttonGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8
  },
  actionButton: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#f5f5f5",
    border: "1px solid #ddd",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold",
    textAlign: "left",
    transition: "background-color 0.2s",
    ':hover': {
      backgroundColor: "#e9e9e9"
    }
  },
  logoutButton: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    borderColor: "#ffcdd2",
    marginTop: 10,
    ':hover': {
      backgroundColor: "#ffcdd2"
    }
  },
  editForm: {
    marginTop: 10
  },
  formGroup: {
    marginBottom: 15
  },
  label: {
    display: "block",
    marginBottom: 5,
    fontWeight: 500,
    color: "#555",
    fontSize: 14
  },
  input: {
    width: "100%",
    padding: "10px",
    borderRadius: 6,
    border: "1px solid #ddd",
    fontSize: 14,
    boxSizing: "border-box"
  },
  passwordForm: {
    marginBottom: 15
  },
  formTitle: {
    margin: "0 0 10px 0",
    color: "#333"
  },
  buttonRow: {
    display: "flex",
    gap: 10
  },
  saveButton: {
    flex: 2,
    padding: "10px",
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold"
  },
  cancelButton: {
    flex: 1,
    padding: "10px",
    backgroundColor: "#f5f5f5",
    border: "1px solid #ddd",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14
  },
  infoBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#e3f2fd",
    borderRadius: 8,
    borderLeft: "4px solid #1976d2"
  },
  infoText: {
    margin: 0,
    color: "#0d47a1",
    fontSize: 13,
    lineHeight: 1.5
  }
};