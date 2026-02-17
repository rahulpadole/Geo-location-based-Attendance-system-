import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../services/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";

export default function TeacherDashboard() {
  const navigate = useNavigate();

  const [today, setToday] = useState("");
  const [status, setStatus] = useState("Not Marked");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const [college, setCollege] = useState({
    lat: null,
    lng: null,
    radius: null, // km
  });

  /* ------------------ INIT ------------------ */
  useEffect(() => {
    if (!auth.currentUser) {
      navigate("/login");
      return;
    }

    const now = new Date();
    setToday(now.toISOString().split("T")[0]);

    init();
    // eslint-disable-next-line
  }, []);

  const init = async () => {
    await loadCollegeSettings();
    await checkAttendance();
    setLoading(false);
  };

  /* ------------------ LOAD COLLEGE SETTINGS ------------------ */
  const loadCollegeSettings = async () => {
    try {
      const snap = await getDoc(doc(db, "collegeSettings", "main"));
      if (!snap.exists()) {
        setMessage("College settings not configured ❌");
        return;
      }

      const data = snap.data();
      setCollege({
        lat: Number(data.latitude),
        lng: Number(data.longitude),
        radius: Number(data.radius) || 0.15, // default 150m
      });
    } catch (err) {
      console.error(err);
      setMessage("Failed to load college settings ❌");
    }
  };

  /* ------------------ CHECK TODAY ATTENDANCE ------------------ */
  const checkAttendance = async () => {
    try {
      const q = query(
        collection(db, "attendance"),
        where("userId", "==", auth.currentUser.uid),
        where("date", "==", today || new Date().toISOString().split("T")[0])
      );

      const snap = await getDocs(q);
      if (!snap.empty) {
        const record = snap.docs[0].data();
        setStatus(record.status || "Present");
      } else {
        setStatus("Not Marked");
      }
    } catch (err) {
      console.error(err);
      setStatus("Error ❌");
    }
  };

  /* ------------------ LOCATION HELPERS ------------------ */
  const deg2rad = (deg) => deg * (Math.PI / 180);

  const getDistanceInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  /* ------------------ CHECK LOCATION ------------------ */
  const checkLocation = () => {
    if (!navigator.geolocation) {
      setMessage("Geolocation not supported ❌");
      return;
    }

    if (!college.lat || !college.lng) {
      setMessage("College location not loaded ❌");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const dist = getDistanceInKm(
          pos.coords.latitude,
          pos.coords.longitude,
          college.lat,
          college.lng
        );

        if (dist <= college.radius) {
          setMessage("You are inside college campus ✅");
        } else {
          setMessage(
            `Outside campus ❌ (${dist.toFixed(3)} km away)`
          );
        }
      },
      (err) => setMessage("Location error: " + err.message),
      { enableHighAccuracy: true }
    );
  };

  /* ------------------ UI ------------------ */
  if (loading) {
    return (
      <div style={{ textAlign: "center", marginTop: 60 }}>
        <h3>Loading dashboard...</h3>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 650, margin: "40px auto", textAlign: "center" }}>
      <h2>Teacher Dashboard</h2>

      <p>
        <strong>Date:</strong> {today}
      </p>

      <p>
        <strong>Attendance Status:</strong>{" "}
        <span style={{ color: status === "Present" ? "green" : "red" }}>
          {status}
        </span>
      </p>

      {message && <p>{message}</p>}

      {/* ACTIONS */}
      <div style={{ marginTop: 25 }}>
        <button onClick={() => navigate("/teacher/attendance")}>
          Mark Attendance
        </button>
        <button style={{ marginLeft: 10 }} onClick={() => navigate("/teacher/leave")}>
          Mark Leave
        </button>
      </div>

      <div style={{ marginTop: 15 }}>
        <button onClick={() => navigate("/teacher/history")}>
          Attendance History
        </button>
        <button style={{ marginLeft: 10 }} onClick={() => navigate("/teacher/profile")}>
          My Profile
        </button>
      </div>

      <div style={{ marginTop: 15 }}>
        <button onClick={checkLocation}>Check My Location</button>
      </div>
    </div>
  );
}
