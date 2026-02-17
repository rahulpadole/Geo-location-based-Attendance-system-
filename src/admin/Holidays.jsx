import { useState, useEffect } from "react";
import { db, auth } from "../services/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { logAdminAction } from "../utils/logger";

export default function Holidays() {
  const navigate = useNavigate();
  const [holidays, setHolidays] = useState([]);
  const [name, setName] = useState("");
  const [date, setDate] = useState("");
  const [isSpecialEvent, setIsSpecialEvent] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchHolidays();
  }, []);

  const fetchHolidays = async () => {
    const q = query(collection(db, "holidays"), orderBy("date", "asc"));
    const snap = await getDocs(q);
    setHolidays(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  };

  const addHoliday = async (e) => {
    e.preventDefault();
    if (!name || !date) return alert("Please fill all fields");
    setLoading(true);
    try {
      await addDoc(collection(db, "holidays"), { name, date, isSpecialEvent });
      await logAdminAction(auth.currentUser?.email || "Admin", isSpecialEvent ? "Added Special Working Day" : "Added Holiday", name);
      setName("");
      setDate("");
      setIsSpecialEvent(false);
      fetchHolidays();
    } catch (err) {
      alert("Error adding holiday");
    } finally {
      setLoading(false);
    }
  };

  const deleteHoliday = async (id, holidayName) => {
    if (!window.confirm("Delete this entry?")) return;
    await deleteDoc(doc(db, "holidays", id));
    await logAdminAction(auth.currentUser?.email || "Admin", "Deleted Holiday/Event", holidayName);
    fetchHolidays();
  };

  return (
    <div style={{ maxWidth: 800, margin: "30px auto", padding: "0 20px" }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ marginBottom: 20, padding: "8px 16px", cursor: "pointer", borderRadius: 4, border: "1px solid #ccc", background: "#f9f9f9" }}
      >
        ← Back
      </button>
      <h2 style={{ textAlign: "center" }}>Manage Holidays & Special Events</h2>
      <form onSubmit={addHoliday} style={{ marginBottom: 30 }}>
        <div style={{ marginBottom: 10 }}>
          <label>Event Name:</label>
          <input type="text" value={name} onChange={e => setName(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>Date:</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ width: "100%", padding: 8 }} />
        </div>
        <div style={{ marginBottom: 10 }}>
          <label>
            <input type="checkbox" checked={isSpecialEvent} onChange={e => setIsSpecialEvent(e.target.checked)} />
            Is Special Working Day (e.g. Sunday Event)
          </label>
        </div>
        <button type="submit" disabled={loading} style={{ padding: "10px 20px" }}>
          {loading ? "Adding..." : "Add Event"}
        </button>
      </form>

      <table border="1" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Date</th>
            <th>Name</th>
            <th>Type</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {holidays.map(h => (
            <tr key={h.id}>
              <td>{h.date}</td>
              <td>{h.name}</td>
              <td>{h.isSpecialEvent ? "Working Day" : "Holiday"}</td>
              <td><button onClick={() => deleteHoliday(h.id, h.name)}>Delete</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
