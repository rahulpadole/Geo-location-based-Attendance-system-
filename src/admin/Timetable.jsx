import { useEffect, useState } from "react";
import { db } from "../services/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export default function Timetable() {
  const [day, setDay] = useState("monday");
  const [startTime, setStartTime] = useState("");
  const [lateAfter, setLateAfter] = useState("");
  const [endTime, setEndTime] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTimetable(day);
  }, [day]);

  const loadTimetable = async (selectedDay) => {
    try {
      const snap = await getDoc(doc(db, "timetable", selectedDay));
      if (snap.exists()) {
        const data = snap.data();
        setStartTime(data.startTime || "");
        setLateAfter(data.lateAfter || "");
        setEndTime(data.endTime || "");
      } else {
        setStartTime("");
        setLateAfter("");
        setEndTime("");
      }
    } catch (err) {
      console.error(err);
      alert("Failed to load timetable");
    }
  };

  const saveTimetable = async () => {
    if (!startTime || !lateAfter || !endTime) {
      alert("All fields are required");
      return;
    }

    if (lateAfter <= startTime) {
      alert("Late time must be after start time");
      return;
    }

    if (endTime <= lateAfter) {
      alert("End time must be after late time");
      return;
    }

    setLoading(true);
    try {
      await setDoc(doc(db, "timetable", day), {
        startTime,
        lateAfter,
        endTime,
      });
      alert("Timetable saved successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Error saving timetable");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 500, margin: "30px auto" }}>
      <h2>Timetable & Schedule</h2>

      <label>Day</label>
      <select
        value={day}
        onChange={(e) => setDay(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 15 }}
      >
        {DAYS.map((d) => (
          <option key={d} value={d}>
            {d.toUpperCase()}
          </option>
        ))}
      </select>

      <label>Start Time</label>
      <input
        type="time"
        value={startTime}
        onChange={(e) => setStartTime(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 15 }}
      />

      <label>Late After</label>
      <input
        type="time"
        value={lateAfter}
        onChange={(e) => setLateAfter(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 15 }}
      />

      <label>End Time</label>
      <input
        type="time"
        value={endTime}
        onChange={(e) => setEndTime(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 20 }}
      />

      <button onClick={saveTimetable} disabled={loading}>
        {loading ? "Saving..." : "Save Timetable"}
      </button>
    </div>
  );
}
