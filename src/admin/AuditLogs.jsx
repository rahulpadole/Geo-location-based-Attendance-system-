import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { useNavigate } from "react-router-dom";

export default function AuditLogs() {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    try {
      const q = query(
        collection(db, "auditLogs"),
        orderBy("timestamp", "desc")
      );
      const snap = await getDocs(q);
      setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) {
      console.error(err);
      setError("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <p style={{ textAlign: "center", marginTop: 40 }}>Loading audit logs...</p>;
  }

  if (error) {
    return <p style={{ textAlign: "center", color: "red" }}>{error}</p>;
  }

  return (
    <div style={{ maxWidth: 1000, margin: "40px auto", padding: "0 20px" }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ marginBottom: 20, padding: "8px 16px", cursor: "pointer", borderRadius: 4, border: "1px solid #ccc", background: "#f9f9f9" }}
      >
        ← Back
      </button>
      <h2 style={{ textAlign: "center" }}>Admin Audit Logs</h2>

      <div style={{ overflowX: "auto", marginTop: 20 }}>
        <table
          border="1"
          cellPadding="8"
          style={{
            width: "100%",
            borderCollapse: "collapse",
            textAlign: "left",
            boxShadow: "0 2px 5px rgba(0,0,0,0.1)"
          }}
        >
          <thead style={{ background: "#f3f3f3" }}>
            <tr>
              <th style={{ padding: 12 }}>Date / Time</th>
              <th style={{ padding: 12 }}>Admin ID</th>
              <th style={{ padding: 12 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan="3" style={{ textAlign: "center", padding: 20 }}>
                  No audit logs found
                </td>
              </tr>
            ) : (
              logs.map(log => (
                <tr key={log.id}>
                  <td style={{ padding: 12 }}>
                    {log.timestamp && typeof log.timestamp.toDate === "function"
                      ? log.timestamp.toDate().toLocaleString()
                      : "-"}
                  </td>
                  <td style={{ padding: 12 }}>{log.adminId}</td>
                  <td style={{ padding: 12 }}>{log.action}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
