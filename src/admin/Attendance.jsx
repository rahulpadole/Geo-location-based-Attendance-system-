import { useEffect, useState } from "react";
import { db, auth } from "../services/firebase";
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function AdminAttendance() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAttendance();
  }, []);

  const loadAttendance = async () => {
    try {
      const q = query(
        collection(db, "attendance"),
        orderBy("date", "desc")
      );
      const snap = await getDocs(q);

      const data = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      setRecords(data);
    } catch (err) {
      console.error(err);
      alert("Failed to load attendance records");
    } finally {
      setLoading(false);
    }
  };

  const updateField = async (attendanceId, field, value) => {
    try {
      const ref = doc(db, "attendance", attendanceId);
      await updateDoc(ref, { [field]: value });

      // Audit log
      await addDoc(collection(db, "auditLogs"), {
        adminId: auth.currentUser.uid,
        action: `Updated ${field} for attendance ${attendanceId}`,
        timestamp: serverTimestamp(),
      });

      // Update UI instantly
      setRecords((prev) =>
        prev.map((r) =>
          r.id === attendanceId ? { ...r, [field]: value } : r
        )
      );
    } catch (err) {
      console.error(err);
      alert("Update failed: " + err.message);
    }
  };

  if (loading) {
    return <p style={{ textAlign: "center", marginTop: 40 }}>Loading...</p>;
  }

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: "0 20px" }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ marginBottom: 20, padding: "8px 16px", cursor: "pointer", borderRadius: 4, border: "1px solid #ccc", background: "#f9f9f9" }}
      >
        ← Back
      </button>
      <h2 style={{ textAlign: "center" }}>Attendance Records</h2>

      {records.length === 0 ? (
        <p style={{ textAlign: "center" }}>No records found</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table
            border="1"
            cellPadding="8"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              marginTop: 20,
              boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
            }}
          >
            <thead style={{ background: "#f4f4f4" }}>
              <tr>
                <th>Date</th>
                <th>Teacher</th>
                <th>In Time</th>
                <th>Out Time</th>
                <th>Status</th>
                <th>Late Reason</th>
                <th>In Loc</th>
                <th>Out Loc</th>
              </tr>
            </thead>

            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td style={{ textAlign: "center" }}>{r.date}</td>
                  <td style={{ textAlign: "center" }}>{r.userName || r.userId}</td>

                  <td style={{ textAlign: "center" }}>{r.inTime?.toDate ? r.inTime.toDate().toLocaleTimeString() : (r.inTime || "-")}</td>
                  <td style={{ textAlign: "center" }}>{r.outTime?.toDate ? r.outTime.toDate().toLocaleTimeString() : (r.outTime || "-")}</td>

                  <td style={{ textAlign: "center" }}>{r.status}</td>
                  <td style={{ textAlign: "center" }}>{r.lateReason || "-"}</td>
                  <td style={{ textAlign: "center" }}>{r.inLocation ? `${r.inLocation.distance.toFixed(0)}m` : "-"}</td>
                  <td style={{ textAlign: "center" }}>{r.outLocation ? `${r.outLocation.distance.toFixed(0)}m` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
