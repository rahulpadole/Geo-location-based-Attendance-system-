import { useState, useEffect } from "react";
import { addDoc, collection, doc, getDoc, updateDoc, setDoc } from "firebase/firestore";
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
    active: true
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
        setForm({
          name: data.name || "",
          email: data.email || "",
          department: data.department || "",
          employeeId: data.employeeId || "",
          phone: data.phone || "",
          designation: data.designation || "",
          joiningDate: data.joiningDate || "",
          password: "", // Never load password
          active: data.active !== false
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
    
    if (!form.name.trim()) newErrors.name = "Name required";
    if (!form.email.trim()) newErrors.email = "Email required";
    if (!form.email.includes('@')) newErrors.email = "Invalid email";
    if (!form.department.trim()) newErrors.department = "Department required";
    if (!form.employeeId.trim()) newErrors.employeeId = "Employee ID required";
    if (!id && form.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveTeacher = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const teacherData = {
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        department: form.department.trim(),
        employeeId: form.employeeId.trim(),
        phone: form.phone.trim(),
        designation: form.designation.trim(),
        joiningDate: form.joiningDate,
        active: form.active,
        role: "teacher",
        updatedAt: new Date()
      };

      if (id) {
        // Update existing teacher
        await updateDoc(doc(db, "users", id), teacherData);
        await logAdminAction(auth.currentUser?.email || "Admin", "Updated Teacher", form.name);
        showToast("✅ Teacher updated successfully", "success");
      } else {
        // Create new teacher with Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          form.email.trim().toLowerCase(),
          form.password
        );
        
        // Store teacher data in Firestore (NO PASSWORD)
        await setDoc(doc(db, "users", userCredential.user.uid), {
          ...teacherData,
          createdAt: new Date()
        });
        
        await logAdminAction(auth.currentUser?.email || "Admin", "Added Teacher", form.name);
        showToast("✅ Teacher added successfully", "success");
      }

      navigate("/admin/teachers");
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
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
        ← Back
      </button>
      
      <h2 style={styles.title}>{id ? "Edit Teacher" : "Add Teacher"}</h2>

      <div style={styles.form}>
        <div style={styles.formGroup}>
          <label style={styles.label}>Full Name *</label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}
            style={{...styles.input, borderColor: errors.name ? '#d32f2f' : '#ccc'}}
          />
          {errors.name && <span style={styles.error}>{errors.name}</span>}
        </div>

        <div style={styles.formGroup}>
          <label style={styles.label}>Email *</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
            style={{...styles.input, borderColor: errors.email ? '#d32f2f' : '#ccc'}}
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
              style={{...styles.input, borderColor: errors.employeeId ? '#d32f2f' : '#ccc'}}
            />
            {errors.employeeId && <span style={styles.error}>{errors.employeeId}</span>}
          </div>
          
          <div style={{...styles.formGroup, flex: 1}}>
            <label style={styles.label}>Department *</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => setForm({...form, department: e.target.value})}
              style={{...styles.input, borderColor: errors.department ? '#d32f2f' : '#ccc'}}
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
              style={{...styles.input, borderColor: errors.password ? '#d32f2f' : '#ccc'}}
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
            />
          </div>
          
          <div style={{...styles.formGroup, flex: 1}}>
            <label style={styles.label}>Phone</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({...form, phone: e.target.value})}
              style={styles.input}
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
          <label>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({...form, active: e.target.checked})}
            />
            Active Status
          </label>
        </div>

        <button
          onClick={saveTeacher}
          disabled={loading}
          style={{
            ...styles.saveButton,
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? <LoadingSpinner size="small" /> : (id ? "Update Teacher" : "Save Teacher")}
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 600,
    margin: "30px auto",
    padding: 20
  },
  backButton: {
    padding: "8px 16px",
    marginBottom: 20,
    cursor: "pointer",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#f9f9f9"
  },
  title: {
    textAlign: "center",
    marginBottom: 30
  },
  form: {
    display: "grid",
    gap: 15
  },
  formGroup: {
    display: "flex",
    flexDirection: "column"
  },
  row: {
    display: "flex",
    gap: 15
  },
  label: {
    marginBottom: 5,
    fontWeight: 500
  },
  input: {
    padding: 10,
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 14
  },
  checkboxGroup: {
    marginTop: 10
  },
  saveButton: {
    marginTop: 20,
    padding: 12,
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