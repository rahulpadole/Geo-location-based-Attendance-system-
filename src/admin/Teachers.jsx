import { useEffect, useState } from "react";
import { collection, getDocs, deleteDoc, doc } from "firebase/firestore";
import { db, auth } from "../services/firebase";
import { Link, useNavigate } from "react-router-dom";
import { logAdminAction } from "../utils/logger";

export default function Teachers() {
  const navigate = useNavigate();
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Load teachers
  const loadTeachers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "users"));
      const list = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((u) => u.role === "teacher");
      setTeachers(list);
    } catch (err) {
      console.error(err);
      alert("Failed to load teachers");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  // Delete teacher
  const removeTeacher = async (id, teacherName) => {
    if (!window.confirm("Are you sure you want to delete this teacher?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      await logAdminAction(auth.currentUser?.email || "Admin", "Deleted Teacher", teacherName);
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      alert("Teacher deleted ✅");
    } catch (err) {
      console.error(err);
      alert("Failed to delete teacher");
    }
  };

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: "0 20px" }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ marginBottom: 20, padding: "8px 16px", cursor: "pointer", borderRadius: 4, border: "1px solid #ccc", background: "#f9f9f9" }}
      >
        ← Back
      </button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2>Teacher Management</h2>
        <Link to="/admin/teachers/add">
          <button style={{ padding: "10px 20px", backgroundColor: "#2e7d32", color: "#fff", border: "none", borderRadius: 4, cursor: "pointer", fontWeight: "bold" }}>➕ Add Teacher</button>
        </Link>
      </div>

      {loading ? (
        <p style={{ textAlign: "center" }}>Loading...</p>
      ) : teachers.length === 0 ? (
        <p style={{ textAlign: "center" }}>No teachers found</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table border="1" cellPadding="10" style={{ width: "100%", borderCollapse: "collapse", boxShadow: "0 2px 5px rgba(0,0,0,0.1)" }}>
            <thead style={{ background: "#f4f4f4" }}>
              <tr>
                <th>Employee ID</th>
                <th>Name</th>
                <th>Department</th>
                <th>Phone</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td style={{ textAlign: "center" }}>{t.employeeId || "-"}</td>
                  <td>{t.name}</td>
                  <td style={{ textAlign: "center" }}>{t.department}</td>
                  <td style={{ textAlign: "center" }}>{t.phone || "-"}</td>
                  <td style={{ textAlign: "center" }}>
                    <Link to={`/admin/teachers/edit/${t.id}`}>
                      <button style={{ marginRight: 8, padding: "4px 8px" }}>✏️ Edit</button>
                    </Link>{" "}
                    <button onClick={() => removeTeacher(t.id, t.name)} style={{ backgroundColor: "#d32f2f", color: "#fff", border: "none", padding: "4px 8px", cursor: "pointer" }}>🗑️ Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
