import { useState, useEffect } from "react";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { db, auth } from "../services/firebase";
import { useParams, useNavigate } from "react-router-dom";
import BackButton from "../components/BackButton";
import { logAdminAction } from "../utils/logger";

export default function AdminForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    adminId: "",
    designation: "",
    phone: "",
    department: "",
    password: "",
    isActive: true,
  });

  const [loading, setLoading] = useState(false);

  /* ---------------- LOAD ADMIN (EDIT MODE) ---------------- */
  useEffect(() => {
    if (!id) return;

    const loadAdmin = async () => {
      try {
        const snap = await getDoc(doc(db, "users", id));

        if (!snap.exists()) {
          alert("Admin not found");
          navigate("/admin/dashboard");
          return;
        }

        setForm((prev) => ({
          ...prev,
          ...snap.data(),
          password: "",
        }));
      } catch (err) {
        console.error(err);
        alert("Error loading admin");
      }
    };

    loadAdmin();
  }, [id, navigate]);

  /* ---------------- VALIDATION ---------------- */
  const validate = () => {
    if (!form.name.trim()) return "Name required";
    if (!form.email.trim()) return "Email required";
    if (!form.adminId.trim()) return "Admin ID required";
    if (!id && form.password.length < 6)
      return "Password must be at least 6 characters";
    return null;
  };

  /* ---------------- SAVE ---------------- */
  const saveAdmin = async () => {
    const error = validate();
    if (error) return alert(error);

    setLoading(true);

    try {
      if (id) {
        // UPDATE
        await updateDoc(doc(db, "users", id), {
          name: form.name,
          email: form.email.toLowerCase(),
          adminId: form.adminId,
          designation: form.designation,
          phone: form.phone,
          department: form.department,
          isActive: form.isActive,
        });

        await logAdminAction(
          auth.currentUser.uid,
          "Updated Admin",
          form.name
        );

        alert("✅ Admin updated successfully");
      } else {
        // CREATE NEW ADMIN
        const cred = await createUserWithEmailAndPassword(
          auth,
          form.email.toLowerCase(),
          form.password
        );

        await setDoc(doc(db, "users", cred.user.uid), {
          name: form.name,
          email: form.email.toLowerCase(),
          role: "admin",
          adminId: form.adminId,
          designation: form.designation,
          department: form.department,
          phone: form.phone,
          isActive: true,
          createdAt: serverTimestamp(),
        });

        await logAdminAction(
          auth.currentUser.uid,
          "Created Admin",
          form.name
        );

        alert("✅ Admin created successfully");
      }

      navigate("/admin/dashboard");
    } catch (err) {
      console.error(err);
      alert("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.pageContainer}>
      <div style={styles.headerRow}>
        <BackButton fallbackPath="/admin/dashboard" />
        <h2>{id ? "📝 Edit Admin" : "➕ Add New Admin"}</h2>
      </div>

      <div style={styles.card}>
        <div style={styles.formGrid}>
          <Input label="Full Name*" value={form.name}
            onChange={(v) => setForm({ ...form, name: v })} />

          <Input label="Email*" type="email" value={form.email}
            onChange={(v) => setForm({ ...form, email: v })} />

          <Input label="Admin ID*" value={form.adminId}
            onChange={(v) => setForm({ ...form, adminId: v })} />

          <Input label="Designation" value={form.designation}
            onChange={(v) => setForm({ ...form, designation: v })} />

          <Input label="Department" value={form.department}
            onChange={(v) => setForm({ ...form, department: v })} />

          <Input label="Phone" value={form.phone}
            onChange={(v) => setForm({ ...form, phone: v })} />

          {!id && (
            <Input label="Password*" type="password"
              value={form.password}
              onChange={(v) => setForm({ ...form, password: v })} />
          )}

          <div style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
            />
            <span>Active Status</span>
          </div>
        </div>

        <button
          onClick={saveAdmin}
          disabled={loading}
          style={{
            ...styles.primaryBtn,
            backgroundColor: loading ? "#ccc" : "#007bff",
          }}
        >
          {loading ? "Processing..." : id ? "Update Admin" : "Create Admin"}
        </button>
      </div>
    </div>
  );
}

/* ---------------- REUSABLE INPUT ---------------- */
function Input({ label, value, onChange, type = "text" }) {
  return (
    <div style={styles.inputGroup}>
      <label>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={styles.input}
      />
    </div>
  );
}

/* ---------------- STYLES ---------------- */
const styles = {
  pageContainer: {
    padding: "20px",
    maxWidth: "800px",
    margin: "0 auto",
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    marginBottom: "20px",
  },
  card: {
    background: "#fff",
    padding: "30px",
    borderRadius: "10px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
  },
  formGrid: {
    display: "grid",
    gap: "15px",
  },
  inputGroup: {
    display: "flex",
    flexDirection: "column",
  },
  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #ccc",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  primaryBtn: {
    marginTop: "20px",
    width: "100%",
    padding: "12px",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },
};
