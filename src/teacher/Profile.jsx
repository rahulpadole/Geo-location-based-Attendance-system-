import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { signOut, deleteUser, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmDialog from "../components/ConfirmDialog";

export default function TeacherProfile() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalLate: 0,
    totalAbsent: 0,
    attendanceRate: 0,
    totalRecords: 0
  });
  const [statsError, setStatsError] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [newPassword, setNewPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [editForm, setEditForm] = useState({
    name: "",
    phone: "",
    designation: "",
    department: "",
    employeeId: ""
  });

  useEffect(() => {
    loadProfile();
    loadAttendanceStats();
    
    // Listen for profile updates
    const handleProfileUpdate = () => {
      console.log("Profile updated event received");
      loadProfile();
      loadAttendanceStats();
    };
    
    window.addEventListener('profile-updated', handleProfileUpdate);
    
    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const currentUser = auth.currentUser;
      if (!currentUser) {
        navigate("/login");
        return;
      }

      const uid = currentUser.uid;
      const snap = await getDoc(doc(db, "users", uid));
      
      if (snap.exists()) {
        const userData = snap.data();
        
        if (userData.role !== "teacher") {
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

        setEditForm({
          name: userData.name || "",
          phone: userData.phone || "",
          designation: userData.designation || "",
          department: userData.department || "",
          employeeId: userData.employeeId || ""
        });
      } else {
        showToast("User not found", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to load profile: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);
      
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      // Calculate last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log("Loading profile stats for user:", currentUser.uid);
      console.log("Date range:", startDateStr, "to", endDateStr);

      // Try with date range query first
      try {
        const attendanceQuery = query(
          collection(db, "attendance"),
          where("userId", "==", currentUser.uid),
          where("date", ">=", startDateStr),
          where("date", "<=", endDateStr)
        );

        const snapshot = await getDocs(attendanceQuery);
        console.log("Query successful, found records:", snapshot.size);
        
        const records = snapshot.docs.map(doc => doc.data());
        calculateAndSetStats(records);
        
      } catch (indexError) {
        console.log("Date range query failed, trying fallback:", indexError.message);
        setStatsError("Using limited data. Index is being built.");
        
        // Fallback: Get all records and filter in memory
        const allRecordsQuery = query(
          collection(db, "attendance"),
          where("userId", "==", currentUser.uid)
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

    } catch (error) {
      console.error("Error loading attendance stats:", error);
      setStatsError(error.message);
      showToast("Failed to load attendance statistics", "warning");
      
      // Set default values so UI doesn't break
      setStats({
        totalPresent: 0,
        totalLate: 0,
        totalAbsent: 0,
        attendanceRate: 0,
        totalRecords: 0
      });
    } finally {
      setStatsLoading(false);
    }
  };

  const calculateAndSetStats = (records) => {
    const total = records.length;
    const present = records.filter(r => r.status === 'Present').length;
    const late = records.filter(r => r.status === 'Late').length;
    const absent = records.filter(r => r.status === 'Absent').length;
    
    const attended = present + late;
    const rate = total > 0 ? Math.round((attended / total) * 100) : 0;

    console.log("Profile stats calculated:", {
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
      totalRecords: total
    });
  };

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

  const validateEditForm = () => {
    if (!editForm.name.trim()) {
      showToast("Name is required", "error");
      return false;
    }
    if (!editForm.employeeId.trim()) {
      showToast("Employee ID is required", "error");
      return false;
    }
    return true;
  };

  const updateProfile = async () => {
    if (!validateEditForm()) return;

    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      
      await updateDoc(doc(db, "users", currentUser.uid), {
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        designation: editForm.designation.trim(),
        department: editForm.department.trim(),
        employeeId: editForm.employeeId.trim(),
        updatedAt: new Date()
      });

      setUser(prev => ({
        ...prev,
        name: editForm.name.trim(),
        phone: editForm.phone.trim(),
        designation: editForm.designation.trim(),
        department: editForm.department.trim(),
        employeeId: editForm.employeeId.trim()
      }));

      showToast("✅ Profile updated successfully", "success");
      setShowEditForm(false);
      
      // Trigger both dashboard and profile updates
      window.dispatchEvent(new Event('profile-updated'));
      window.dispatchEvent(new Event('attendance-updated'));
      
    } catch (err) {
      console.error(err);
      showToast("Error: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const deleteAccount = async () => {
    setShowDeleteDialog(false);
    setLoading(true);
    
    try {
      const user = auth.currentUser;
      
      await updateDoc(doc(db, "users", user.uid), {
        isActive: false,
        deletedAt: new Date()
      });
      
      await deleteUser(user);
      
      showToast("✅ Account deleted successfully", "success");
      navigate("/login");
      
    } catch (err) {
      console.error(err);
      showToast("❌ Failed to delete account: " + err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error(err);
      showToast("Failed to logout: " + err.message, "error");
    }
  };

  if (loading && !user) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <p>Loading profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div style={styles.container}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ← Back
        </button>
        <div style={styles.errorCard}>
          <h3>User not found</h3>
          <p>Please login again</p>
          <button onClick={logout} style={styles.logoutBtn}>
            Go to Login
          </button>
        </div>
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
          {user.name?.charAt(0) || user.email?.charAt(0) || "T"}
        </div>
        <div style={styles.headerInfo}>
          <h2 style={styles.name}>{user.name || "Teacher"}</h2>
          <p style={styles.email}>{user.email}</p>
          <span style={styles.roleBadge}>Teacher</span>
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
              >
                ✏️ Edit
              </button>
            )}
          </div>
          
          {!showEditForm ? (
            <>
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Employee ID</span>
                <span style={styles.detailValue}>{user.employeeId || "-"}</span>
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
                <span style={styles.detailLabel}>Department</span>
                <span style={styles.detailValue}>{user.department || "-"}</span>
              </div>
              
              <div style={styles.detailRow}>
                <span style={styles.detailLabel}>Designation</span>
                <span style={styles.detailValue}>{user.designation || "-"}</span>
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
            <div style={styles.editForm}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Employee ID *</label>
                <input
                  type="text"
                  name="employeeId"
                  value={editForm.employeeId}
                  onChange={handleEditChange}
                  style={styles.input}
                  placeholder="Enter employee ID"
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
                <label style={styles.label}>Department</label>
                <input
                  type="text"
                  name="department"
                  value={editForm.department}
                  onChange={handleEditChange}
                  style={styles.input}
                  placeholder="e.g., Computer Science"
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
                  placeholder="e.g., Senior Lecturer"
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
                    setEditForm({
                      name: user.name || "",
                      phone: user.phone || "",
                      designation: user.designation || "",
                      department: user.department || "",
                      employeeId: user.employeeId || ""
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

        {/* Attendance Stats Card */}
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Attendance Summary (Last 30 Days)</h3>
          
          {statsLoading ? (
            <div style={styles.statsLoading}>
              <LoadingSpinner size="small" />
              <p>Loading statistics...</p>
            </div>
          ) : statsError ? (
            <div style={styles.statsError}>
              <p>⚠️ {statsError}</p>
              <p style={styles.statsErrorHint}>Showing available data</p>
            </div>
          ) : null}
          
          <div style={styles.statsGrid}>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.totalPresent}</span>
              <span style={styles.statLabel}>Present</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.totalLate}</span>
              <span style={styles.statLabel}>Late</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.totalAbsent}</span>
              <span style={styles.statLabel}>Absent</span>
            </div>
            <div style={styles.statItem}>
              <span style={styles.statValue}>{stats.attendanceRate}%</span>
              <span style={styles.statLabel}>Rate</span>
            </div>
          </div>

          {stats.totalRecords > 0 && (
            <div style={styles.statsSummary}>
              <p>Total records: <strong>{stats.totalRecords}</strong></p>
              <p>Attendance rate: <strong>{stats.attendanceRate}%</strong></p>
            </div>
          )}

          {stats.totalRecords === 0 && !statsLoading && !statsError && (
            <div style={styles.noDataMessage}>
              <p>No attendance records in last 30 days</p>
            </div>
          )}

          <div style={styles.buttonGroup}>
            <button
              onClick={() => navigate("/teacher/attendance")}
              style={styles.actionButton}
            >
              📍 Mark Attendance
            </button>
            
            <button
              onClick={() => navigate("/teacher/history")}
              style={styles.actionButton}
            >
              📋 View History
            </button>
            
            <button
              onClick={() => navigate("/teacher/leave")}
              style={styles.actionButton}
            >
              ✈️ Request Leave
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

          <button
            onClick={() => setShowDeleteDialog(true)}
            style={{...styles.actionButton, ...styles.deleteButton}}
          >
            🗑️ Delete Account
          </button>
        </div>
      </div>

      <div style={styles.infoBox}>
        <p style={styles.infoText}>
          <strong>📌 Note:</strong> Your attendance is tracked based on your check-in/check-out times. 
          Make sure to mark attendance within the college premises.
        </p>
      </div>

      <ConfirmDialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onConfirm={deleteAccount}
        title="Delete Account"
        message="Are you sure you want to delete your account? This action cannot be undone and your attendance data will be preserved for records."
        confirmText="Delete Permanently"
        cancelText="Cancel"
        type="danger"
      />
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
    fontSize: 14
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
    backgroundColor: "#2e7d32",
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
    backgroundColor: "#e8f5e8",
    color: "#2e7d32",
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
    borderBottom: "2px solid #2e7d32",
    paddingBottom: 8
  },
  cardTitle: {
    margin: 0,
    color: "#333"
  },
  editButton: {
    padding: "4px 8px",
    backgroundColor: "transparent",
    border: "1px solid #2e7d32",
    borderRadius: 4,
    color: "#2e7d32",
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
    color: "#2e7d32"
  },
  statLabel: {
    fontSize: 12,
    color: "#666"
  },
  statsLoading: {
    textAlign: "center",
    padding: "20px",
    color: "#666"
  },
  statsError: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    padding: "10px",
    borderRadius: 6,
    marginBottom: "10px",
    textAlign: "center"
  },
  statsErrorHint: {
    fontSize: "12px",
    color: "#666",
    marginTop: "5px"
  },
  statsSummary: {
    backgroundColor: "#e8f5e8",
    padding: "10px",
    borderRadius: 6,
    marginBottom: 15,
    textAlign: "center"
  },
  noDataMessage: {
    textAlign: "center",
    padding: "20px",
    color: "#999",
    fontStyle: "italic"
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
    textAlign: "left"
  },
  logoutButton: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    borderColor: "#ffcdd2",
    marginTop: 10
  },
  deleteButton: {
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    borderColor: "#ffcdd2",
    marginTop: 5
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
    backgroundColor: "#2e7d32",
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
  errorCard: {
    textAlign: "center",
    padding: 40,
    backgroundColor: "#ffebee",
    borderRadius: 12,
    border: "1px solid #ffcdd2"
  },
  logoutBtn: {
    padding: "10px 20px",
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer"
  },
  infoBox: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#e8f5e8",
    borderRadius: 8,
    borderLeft: "4px solid #2e7d32"
  },
  infoText: {
    margin: 0,
    color: "#1b5e20",
    fontSize: 13,
    lineHeight: 1.5
  }
};