import { auth, db } from "../services/firebase";
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function MarkLeave() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const leave = async () => {
    setLoading(true);
    try {
      const uid = auth.currentUser.uid;
      const today = new Date().toISOString().split("T")[0];
      const time = new Date().toTimeString().slice(0, 5);
      const attendanceRef = doc(db, "attendance", `${uid}_${today}`);

      const docSnap = await getDoc(attendanceRef);

      if (docSnap.exists()) {
        // Update existing attendance
        await updateDoc(attendanceRef, {
          outTime: time,
        });
      } else {
        // Create new attendance document if not exists
        await setDoc(attendanceRef, {
          userId: uid,
          date: today,
          inTime: "",
          outTime: time,
          status: "Absent",
          lateReason: "",
          timestamp: serverTimestamp(),
        });
      }

      alert("✅ Leave time recorded successfully");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to mark leave: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "40px auto", padding: "0 20px" }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ marginBottom: 20, padding: "8px 16px", cursor: "pointer", borderRadius: 4, border: "1px solid #ccc", background: "#f9f9f9" }}
      >
        ← Back
      </button>
      <div style={{ border: "1px solid #ddd", padding: 30, borderRadius: 12, boxShadow: "0 4px 10px rgba(0,0,0,0.1)", background: "#fff", textAlign: "center" }}>
        <h2 style={{ marginBottom: 20 }}>Mark Leave</h2>
        <p style={{ marginBottom: 20, color: "#666" }}>Recording your leave will mark your attendance as absent for today.</p>
        <button 
          onClick={leave} 
          disabled={loading}
          style={{ padding: "12px 24px", cursor: "pointer", backgroundColor: "#d32f2f", color: "#fff", border: "none", borderRadius: 4, fontWeight: "bold", width: "100%" }}
        >
          {loading ? "Processing..." : "Confirm Leave"}
        </button>
      </div>
    </div>
  );
}
