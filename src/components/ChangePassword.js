import { useState } from "react";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth, db } from "../services/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "../hooks/useToast";
import LoadingSpinner from "./LoadingSpinner";

export default function ChangePassword({ onSuccess, onCancel }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { showToast } = useToast();

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) errors.push("at least 8 characters");
    if (!/[A-Z]/.test(password)) errors.push("one uppercase letter");
    if (!/[a-z]/.test(password)) errors.push("one lowercase letter");
    if (!/[0-9]/.test(password)) errors.push("one number");
    if (!/[!@#$%^&*]/.test(password)) errors.push("one special character (!@#$%^&*)");
    return errors;
  };

  const validate = () => {
    const newErrors = {};
    
    if (!currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }
    
    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else {
      const passwordErrors = validatePassword(newPassword);
      if (passwordErrors.length > 0) {
        newErrors.newPassword = `Password must contain: ${passwordErrors.join(", ")}`;
      }
    }
    
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }
    
    if (newPassword && newPassword === currentPassword) {
      newErrors.newPassword = "New password must be different from current";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;
    
    setLoading(true);
    try {
      // Re-authenticate user before changing password
      const user = auth.currentUser;
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      
      // Update password
      await updatePassword(user, newPassword);
      
      // Update user document with password change timestamp
      await updateDoc(doc(db, "users", user.uid), {
        passwordLastChanged: serverTimestamp(),
        requirePasswordChange: false
      });
      
      // Log the action
      await updateDoc(doc(db, "auditLogs", `pwd_${Date.now()}`), {
        adminId: user.uid,
        adminEmail: user.email,
        action: "PASSWORD_CHANGED",
        timestamp: serverTimestamp(),
        ipAddress: await fetchIP() // Implement this
      });
      
      showToast("Password updated successfully", "success");
      
      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      
      onSuccess?.();
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/wrong-password') {
        showToast("Current password is incorrect", "error");
      } else {
        showToast(error.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to get user IP (implement properly)
  const fetchIP = async () => {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch {
      return 'unknown';
    }
  };

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      <h3 style={styles.title}>Change Password</h3>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Current Password *</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          style={{...styles.input, borderColor: errors.currentPassword ? '#d32f2f' : '#ccc'}}
          disabled={loading}
        />
        {errors.currentPassword && <span style={styles.error}>{errors.currentPassword}</span>}
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>New Password *</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          style={{...styles.input, borderColor: errors.newPassword ? '#d32f2f' : '#ccc'}}
          disabled={loading}
        />
        {errors.newPassword && <span style={styles.error}>{errors.newPassword}</span>}
        <small style={styles.hint}>
          Password must contain: at least 8 characters, uppercase, lowercase, number, and special character (!@#$%^&*)
        </small>
      </div>
      
      <div style={styles.formGroup}>
        <label style={styles.label}>Confirm New Password *</label>
        <input
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          style={{...styles.input, borderColor: errors.confirmPassword ? '#d32f2f' : '#ccc'}}
          disabled={loading}
        />
        {errors.confirmPassword && <span style={styles.error}>{errors.confirmPassword}</span>}
      </div>
      
      <div style={styles.strengthIndicator}>
        {newPassword && (
          <div style={styles.strengthBar}>
            {validatePassword(newPassword).length === 0 ? (
              <span style={{color: '#2e7d32'}}>✓ Strong password</span>
            ) : (
              <span style={{color: '#d32f2f'}}>⚠ Weak password</span>
            )}
          </div>
        )}
      </div>
      
      <div style={styles.actions}>
        <button type="button" onClick={onCancel} style={styles.cancelButton} disabled={loading}>
          Cancel
        </button>
        <button type="submit" disabled={loading} style={styles.submitButton}>
          {loading ? <LoadingSpinner size="small" /> : "Update Password"}
        </button>
      </div>
    </form>
  );
}

const styles = {
  form: {
    maxWidth: 500,
    margin: "0 auto",
    padding: 30,
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },
  title: {
    marginTop: 0,
    marginBottom: 20,
    color: "#333",
    textAlign: "center"
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
    padding: "12px",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14,
    boxSizing: "border-box"
  },
  error: {
    color: "#d32f2f",
    fontSize: 12,
    marginTop: 3,
    display: "block"
  },
  hint: {
    color: "#666",
    fontSize: 12,
    marginTop: 3,
    display: "block"
  },
  strengthIndicator: {
    marginBottom: 20
  },
  strengthBar: {
    padding: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 4,
    fontSize: 12
  },
  actions: {
    display: "flex",
    gap: 10
  },
  cancelButton: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#f5f5f5",
    border: "1px solid #ccc",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold"
  },
  submitButton: {
    flex: 1,
    padding: "12px",
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 14,
    fontWeight: "bold"
  }
};