import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { Link, useNavigate } from "react-router-dom";
import { logAdminAction } from "../utils/logger";
import { useToast } from "../hooks/useToast";
import LoadingSpinner from "../components/LoadingSpinner";
import ConfirmDialog from "../components/ConfirmDialog";

export default function Teachers() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    id: null,
    name: "",
    email: "",
    uid: ""
  });

  // Initialize Firebase Functions
  const functions = getFunctions();
  const deleteUserAuth = httpsCallable(functions, 'deleteUserAuth');

  // Load teachers
  const loadTeachers = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "users"),
        where("role", "==", "teacher")
      );
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ 
        id: d.id, 
        uid: d.id, // Document ID is the Auth UID
        ...d.data() 
      }));
      setTeachers(list);
    } catch (err) {
      console.error(err);
      showToast("Failed to load teachers", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  // Delete teacher from both Firestore AND Firebase Auth
  const removeTeacher = async () => {
    const { id, name, uid, email } = deleteDialog;
    
    setLoading(true);
    setDeletingId(id);
    
    try {
      let authDeleted = false;
      let firestoreDeleted = false;

      // Step 1: Delete from Firebase Authentication using Cloud Function
      try {
        showToast(`Deleting ${name} from Authentication...`, "info");
        const result = await deleteUserAuth({ uid });
        console.log("Auth deletion result:", result.data);
        authDeleted = true;
        showToast(`✓ User removed from Authentication`, "success");
      } catch (authError) {
        console.error("Auth deletion error:", authError);
        
        // Handle specific error cases
        if (authError.code === 'functions/not-found') {
          showToast(`User not found in Authentication (may already be deleted)`, "warning");
          authDeleted = true; // Consider as success if user doesn't exist
        } else if (authError.code === 'functions/permission-denied') {
          showToast(`Permission denied: ${authError.message}`, "error");
        } else {
          showToast(`Failed to delete from Auth: ${authError.message}`, "error");
        }
      }
      
      // Step 2: Delete from Firestore (always try, even if Auth fails)
      try {
        await deleteDoc(doc(db, "users", id));
        firestoreDeleted = true;
        showToast(`✓ User data removed from database`, "success");
      } catch (firestoreError) {
        console.error("Firestore deletion error:", firestoreError);
        showToast(`Failed to delete from database: ${firestoreError.message}`, "error");
      }
      
      // Step 3: Log the action if either deletion succeeded
      if (authDeleted || firestoreDeleted) {
        await logAdminAction(
          auth.currentUser?.uid || "Admin",
          "Deleted Teacher",
          `${name} (${email}) - Auth: ${authDeleted ? '✓' : '✗'}, DB: ${firestoreDeleted ? '✓' : '✗'}`
        );
      }
      
      // Step 4: Update UI if Firestore was deleted
      if (firestoreDeleted) {
        setTeachers((prev) => prev.filter((t) => t.id !== id));
      }
      
      // Show final status
      if (authDeleted && firestoreDeleted) {
        showToast(`✅ Teacher ${name} completely removed from system`, "success");
      } else if (firestoreDeleted) {
        showToast(`⚠️ Teacher ${name} removed from database only. Auth deletion failed.`, "warning");
      } else if (authDeleted) {
        showToast(`⚠️ Teacher ${name} removed from Auth only. Database deletion failed.`, "warning");
      } else {
        showToast(`❌ Failed to delete teacher ${name}`, "error");
      }
      
      // Close dialog
      setDeleteDialog({ isOpen: false, id: null, name: "", email: "", uid: "" });
      
    } catch (err) {
      console.error("Unexpected error:", err);
      showToast("Unexpected error: " + err.message, "error");
    } finally {
      setLoading(false);
      setDeletingId(null);
    }
  };

  // Open delete confirmation dialog
  const confirmDelete = (teacher) => {
    setDeleteDialog({
      isOpen: true,
      id: teacher.id,
      name: teacher.name,
      email: teacher.email,
      uid: teacher.uid
    });
  };

  if (loading && teachers.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <div style={styles.container}>
      <button 
        onClick={() => navigate(-1)} 
        style={styles.backButton}
      >
        ← Back
      </button>
      
      <div style={styles.header}>
        <h2 style={styles.title}>Teacher Management</h2>
        <Link to="/admin/teachers/add">
          <button style={styles.addButton}>
            ➕ Add Teacher
          </button>
        </Link>
      </div>

      {/* Summary Stats */}
      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{teachers.length}</span>
          <span style={styles.statLabel}>Total Teachers</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{teachers.filter(t => t.isActive).length}</span>
          <span style={styles.statLabel}>Active</span>
        </div>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{teachers.filter(t => !t.isActive).length}</span>
          <span style={styles.statLabel}>Inactive</span>
        </div>
      </div>

      {teachers.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyIcon}>👨‍🏫</p>
          <h3 style={styles.emptyTitle}>No Teachers Found</h3>
          <p style={styles.emptyMessage}>Click "Add Teacher" to create your first teacher account.</p>
        </div>
      ) : (
        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead style={styles.thead}>
              <tr>
                <th style={styles.th}>Employee ID</th>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Department</th>
                <th style={styles.th}>Phone</th>
                <th style={styles.th}>Status</th>
                
                <th style={styles.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} style={styles.tr}>
                  <td style={styles.td}>{t.employeeId || "-"}</td>
                  <td style={styles.td}>
                    <strong>{t.name}</strong>
                  </td>
                  <td style={styles.td}>{t.email}</td>
                  <td style={styles.td}>{t.department}</td>
                  <td style={styles.td}>{t.phone || "-"}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.statusBadge,
                      backgroundColor: t.isActive ? '#e8f5e8' : '#ffebee',
                      color: t.isActive ? '#2e7d32' : '#d32f2f'
                    }}>
                      {t.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <Link to={`/admin/teachers/edit/${t.id}`}>
                        <button 
                          style={styles.editButton} 
                          title="Edit Teacher"
                          disabled={loading && deletingId === t.id}
                        >
                          ✏️
                        </button>
                      </Link>
                      <button 
                        onClick={() => confirmDelete(t)} 
                        style={styles.deleteButton}
                        title="Delete Teacher"
                        disabled={loading && deletingId === t.id}
                      >
                        {loading && deletingId === t.id ? (
                          <LoadingSpinner size="small" />
                        ) : (
                          "🗑️"
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => setDeleteDialog({ isOpen: false, id: null, name: "", email: "", uid: "" })}
        onConfirm={removeTeacher}
        title="Delete Teacher"
        message={`Are you sure you want to delete "${deleteDialog.name}"?\n\nThis will permanently remove them from both the database AND Firebase Authentication.`}
        confirmText="Delete Permanently"
        cancelText="Cancel"
        type="danger"
      />

      {/* Info Box */}
      <div style={styles.infoBox}>
        <p style={styles.infoText}>
          <strong>🔐 Complete Deletion:</strong> When you delete a teacher, they are removed from:
        </p>
        <ul style={styles.infoList}>
          <li>✅ Firebase Authentication (can no longer login)</li>
          <li>✅ Firestore Database (all user data)</li>
          <li>✅ All associated records</li>
        </ul>
        <p style={styles.infoNote}>
          <strong>Note:</strong> This action is irreversible and requires Cloud Functions to be deployed.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1300,
    margin: "40px auto",
    padding: "0 20px"
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
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20
  },
  title: {
    margin: 0,
    color: "#333"
  },
  addButton: {
    padding: "10px 20px",
    backgroundColor: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 14,
    ':hover': {
      backgroundColor: '#1b5e20'
    }
  },
  statsBar: {
    display: "flex",
    gap: 15,
    marginBottom: 25,
    backgroundColor: "#fff",
    padding: "15px 20px",
    borderRadius: 12,
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
  },
  statItem: {
    flex: 1,
    textAlign: "center",
    borderRight: "1px solid #eee",
    padding: "0 10px",
    ':last-child': {
      borderRight: 'none'
    }
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
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    border: "2px dashed #ddd"
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 20,
    opacity: 0.5
  },
  emptyTitle: {
    marginBottom: 10,
    color: "#666"
  },
  emptyMessage: {
    color: "#999"
  },
  tableContainer: {
    overflowX: "auto",
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 1000
  },
  thead: {
    backgroundColor: "#f5f5f5"
  },
  th: {
    padding: "15px 12px",
    textAlign: "left",
    fontWeight: "bold",
    borderBottom: "2px solid #ddd"
  },
  tr: {
    borderBottom: "1px solid #eee",
    ':hover': {
      backgroundColor: "#f9f9f9"
    }
  },
  td: {
    padding: "12px",
    textAlign: "left"
  },
  statusBadge: {
    display: "inline-block",
    padding: "4px 8px",
    borderRadius: 4,
    fontSize: 12,
    fontWeight: "bold"
  },
  uid: {
    fontFamily: "monospace",
    fontSize: 12,
    color: "#666",
    backgroundColor: "#f5f5f5",
    padding: "2px 4px",
    borderRadius: 4
  },
  actionButtons: {
    display: "flex",
    gap: "8px"
  },
  editButton: {
    padding: "6px 10px",
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
    minWidth: 32,
    ':hover': {
      backgroundColor: '#1565c0'
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  deleteButton: {
    padding: "6px 10px",
    backgroundColor: "#d32f2f",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14,
    minWidth: 32,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ':hover': {
      backgroundColor: '#b71c1c'
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  infoBox: {
    marginTop: 25,
    padding: 20,
    backgroundColor: "#e3f2fd",
    borderRadius: 12,
    borderLeft: "4px solid #1976d2"
  },
  infoText: {
    margin: "0 0 10px 0",
    color: "#0d47a1",
    fontSize: 14,
    fontWeight: "bold"
  },
  infoList: {
    margin: "0 0 10px 20px",
    color: "#0d47a1",
    fontSize: 13,
    lineHeight: 1.6
  },
  infoNote: {
    margin: 0,
    color: "#d32f2f",
    fontSize: 13,
    fontStyle: "italic"
  }
};