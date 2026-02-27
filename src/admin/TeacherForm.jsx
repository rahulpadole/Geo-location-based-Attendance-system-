import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../services/firebase";
import { useParams, useNavigate } from "react-router-dom";
import { logAdminAction } from "../utils/logger";
import { useToast } from "../hooks/useToast";
import LoadingSpinner from "../components/LoadingSpinner";

export default function TeacherForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: "",
    email: "",
    department: "",
    employeeId: "",
    phone: "",
    designation: "",
    joiningDate: "",
    password: "",
    isActive: true
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load teacher when editing
  useEffect(() => {
    if (!id) return;

    const loadTeacher = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "users", id));
        if (!snap.exists()) {
          showToast("Teacher not found", "error");
          navigate("/admin/teachers");
          return;
        }
        const data = snap.data();
        
        // Verify this is actually a teacher
        if (data.role !== "teacher") {
          showToast("Invalid user type", "error");
          navigate("/admin/teachers");
          return;
        }

        setForm({
          name: data.name || "",
          email: data.email || "",
          department: data.department || "",
          employeeId: data.employeeId || "",
          phone: data.phone || "",
          designation: data.designation || "",
          joiningDate: data.joiningDate || "",
          password: "",
          isActive: data.isActive !== undefined ? data.isActive : (data.active !== false)
        });
      } catch (err) {
        console.error(err);
        showToast("Failed to load teacher", "error");
      } finally {
        setLoading(false);
      }
    };

    loadTeacher();
  }, [id, navigate, showToast]);

  const validate = () => {
    const newErrors = {};
    
    if (!form.name.trim()) newErrors.name = "Name is required";
    if (!form.email.trim()) newErrors.email = "Email is required";
    if (!form.email.includes('@')) newErrors.email = "Invalid email format";
    if (!form.department.trim()) newErrors.department = "Department is required";
    if (!form.employeeId.trim()) newErrors.employeeId = "Employee ID is required";
    if (!id && form.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveTeacher = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      // Teacher-specific data only - NO ADMIN FIELDS
      const teacherData = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department.trim(),
        employeeId: form.employeeId.trim(),
        phone: form.phone.trim(),
        designation: form.designation.trim(),
        joiningDate: form.joiningDate,
        isActive: form.isActive,
        role: "teacher",  // CRITICAL: Force role to teacher
        updatedAt: new Date()
      };

      if (id) {
        // Update existing teacher
        await updateDoc(doc(db, "users", id), {
          ...teacherData,
          active: form.isActive
        });
        
        await logAdminAction(
          auth.currentUser?.uid || "Admin", 
          "Updated Teacher", 
          form.name
        );
        showToast("✅ Teacher updated successfully", "success");
      } else {
        // Create new teacher with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          form.email.trim().toLowerCase(),
          form.password
        );
        
        // IMPORTANT: Only store teacher-specific fields
        await setDoc(doc(db, "users", userCredential.user.uid), {
          ...teacherData,
          uid: userCredential.user.uid,
          active: form.isActive,
          createdAt: new Date(),
          passwordLastChanged: new Date(),
          requirePasswordChange: false
          // NO adminId, NO admin-specific fields
        });
        
        await logAdminAction(
          auth.currentUser?.uid || "Admin", 
          "Added Teacher", 
          form.name
        );
        showToast("✅ Teacher added successfully", "success");
      }

      navigate("/admin/teachers");
    } catch (err) {
      console.error(err);
      
      if (err.code === 'auth/email-already-in-use') {
        showToast("Email already in use by another account", "error");
      } else if (err.code === 'auth/weak-password') {
        showToast("Password is too weak. Use at least 6 characters.", "error");
      } else {
        showToast(err.message, "error");
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && id) {
    return <LoadingSpinner />;
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>
        ← Back to Teachers
      </button>
      
      <h2 style={styles.title}>{id ? "Edit Teacher" : "Add New Teacher"}</h2>

      <div style={styles.formCard}>
        <div style={styles.form}>
          {/* Form fields remain same as before */}
          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({...form, name: e.target.value})}
              style={{...styles.input, borderColor: errors.name ? '#d32f2f' : '#ddd'}}
              placeholder="Enter full name"
            />
            {errors.name && <span style={styles.error}>{errors.name}</span>}
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              style={{...styles.input, borderColor: errors.email ? '#d32f2f' : '#ddd'}}
              placeholder="teacher@example.com"
            />
            {errors.email && <span style={styles.error}>{errors.email}</span>}
          </div>

          <div style={styles.row}>
            <div style={{...styles.formGroup, flex: 1}}>
              <label style={styles.label}>Employee ID *</label>
              <input
                type="text"
                value={form.employeeId}
                onChange={(e) => setForm({...form, employeeId: e.target.value})}
                style={{...styles.input, borderColor: errors.employeeId ? '#d32f2f' : '#ddd'}}
                placeholder="EMP001"
              />
              {errors.employeeId && <span style={styles.error}>{errors.employeeId}</span>}
            </div>
            
            <div style={{...styles.formGroup, flex: 1}}>
              <label style={styles.label}>Department *</label>
              <input
                type="text"
                value={form.department}
                onChange={(e) => setForm({...form, department: e.target.value})}
                style={{...styles.input, borderColor: errors.department ? '#d32f2f' : '#ddd'}}
                placeholder="Computer Science"
              />
              {errors.department && <span style={styles.error}>{errors.department}</span>}
            </div>
          </div>

          {!id && (
            <div style={styles.formGroup}>
              <label style={styles.label}>Password *</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({...form, password: e.target.value})}
                style={{...styles.input, borderColor: errors.password ? '#d32f2f' : '#ddd'}}
                placeholder="Enter password"
              />
              {errors.password && <span style={styles.error}>{errors.password}</span>}
              <small style={styles.hint}>Minimum 6 characters</small>
            </div>
          )}

          <div style={styles.row}>
            <div style={{...styles.formGroup, flex: 1}}>
              <label style={styles.label}>Designation</label>
              <input
                type="text"
                value={form.designation}
                onChange={(e) => setForm({...form, designation: e.target.value})}
                style={styles.input}
                placeholder="Senior Lecturer"
              />
            </div>
            
            <div style={{...styles.formGroup, flex: 1}}>
              <label style={styles.label}>Phone</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({...form, phone: e.target.value})}
                style={styles.input}
                placeholder="+1234567890"
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>Date of Joining</label>
            <input
              type="date"
              value={form.joiningDate}
              onChange={(e) => setForm({...form, joiningDate: e.target.value})}
              style={styles.input}
            />
          </div>

          <div style={styles.checkboxGroup}>
            <label style={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({...form, isActive: e.target.checked})}
                style={styles.checkbox}
              />
              <span style={styles.checkboxText}>Active Account (Teacher can login)</span>
            </label>
          </div>

          <button
            onClick={saveTeacher}
            disabled={loading}
            style={styles.saveButton}
          >
            {loading ? <LoadingSpinner size="small" /> : (id ? "Update Teacher" : "Create Teacher")}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 700,
    margin: "30px auto",
    padding: "0 20px"
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
  title: {
    textAlign: "center",
    marginBottom: 25,
    color: "#333"
  },
  formCard: {
    backgroundColor: "#fff",
    padding: 30,
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)"
  },
  form: {
    display: "grid",
    gap: 20
  },
  formGroup: {
    display: "flex",
    flexDirection: "column"
  },
  row: {
    display: "flex",
    gap: 15,
    flexWrap: "wrap"
  },
  label: {
    marginBottom: 5,
    fontWeight: 500,
    color: "#555",
    fontSize: 14
  },
  input: {
    padding: "10px 12px",
    borderRadius: 6,
    border: "1px solid #ddd",
    fontSize: 14
  },
  checkboxGroup: {
    marginTop: 10,
    padding: "15px",
    backgroundColor: "#f9f9f9",
    borderRadius: 6
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer"
  },
  checkbox: {
    width: 18,
    height: 18,
    cursor: "pointer"
  },
  checkboxText: {
    fontSize: 14,
    color: "#333"
  },
  saveButton: {
    marginTop: 10,
    padding: "14px",
    backgroundColor: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: 8,
    fontSize: 16,
    fontWeight: "bold",
    cursor: "pointer"
  },
  error: {
    color: "#d32f2f",
    fontSize: 12,
    marginTop: 3
  },
  hint: {
    color: "#666",
    fontSize: 12,
    marginTop: 3
  }
};