import { useEffect, useRef, useState } from "react";
import { auth, db } from "../services/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

export default function MarkAttendance() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [distance, setDistance] = useState(null);
  const [locationAllowed, setLocationAllowed] = useState(false);
  const [selfieTaken, setSelfieTaken] = useState(false);
  const [lateReason, setLateReason] = useState("");
  const [status, setStatus] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // ---------------- CONFIG ----------------
  const RADIUS_KM = 0.15; // 150 meters

  // ---------------- CAMERA ----------------
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => (videoRef.current.srcObject = stream))
      .catch(() => alert("Camera access denied"));
  }, []);

  // ---------------- HELPERS ----------------
  const getDistanceKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
  };

  const getTodayDay = () => {
    return new Date()
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
  };

  const getCurrentTime = () =>
    new Date().toTimeString().slice(0, 5); // HH:mm

  // ---------------- LOCATION CHECK ----------------
  const checkLocation = async () => {
    try {
      const settingsSnap = await getDoc(
        doc(db, "collegeSettings", "main")
      );

      if (!settingsSnap.exists()) {
        alert("College location not set");
        return;
      }

      const { latitude, longitude } = settingsSnap.data();

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const dist = getDistanceKm(
            pos.coords.latitude,
            pos.coords.longitude,
            latitude,
            longitude
          );

          setDistance(dist.toFixed(3));

          if (dist <= RADIUS_KM) {
            setLocationAllowed(true);
            setMessage("Inside college area ✅");
            checkTimetable();
          } else {
            setLocationAllowed(false);
            setMessage("Outside college area ❌");
          }
        },
        () => alert("Location permission denied")
      );
    } catch (err) {
      console.error(err);
    }
  };

  // ---------------- TIMETABLE CHECK ----------------
  const checkTimetable = async () => {
    const day = getTodayDay();
    const timeNow = getCurrentTime();

    const snap = await getDoc(doc(db, "timetable", day));
    if (!snap.exists()) {
      alert("Timetable not configured for today");
      return;
    }

    const { startTime, lateAfter, endTime } = snap.data();

    if (timeNow < startTime || timeNow > endTime) {
      setStatus("Absent");
      setMessage("Attendance time closed ❌");
      return;
    }

    if (timeNow > lateAfter) {
      setStatus("Late");
      setMessage("You are late ⚠️");
    } else {
      setStatus("Present");
      setMessage("You are on time ✅");
    }
  };

  // ---------------- SELFIE ----------------
  const takeSelfie = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.drawImage(videoRef.current, 0, 0, 320, 240);
    setSelfieTaken(true);
    alert("Selfie captured ✅");
  };

  // ---------------- MARK ATTENDANCE ----------------
  const markAttendance = async () => {
    if (!locationAllowed) {
      alert("Location not verified");
      return;
    }
    if (!selfieTaken) {
      alert("Selfie required");
      return;
    }
    if (status === "Late" && !lateReason) {
      alert("Late reason required");
      return;
    }

    setLoading(true);

    try {
      await addDoc(collection(db, "attendance"), {
        userId: auth.currentUser.uid,
        date: new Date().toISOString().split("T")[0],
        inTime: getCurrentTime(),
        status,
        lateReason: status === "Late" ? lateReason : "",
        timestamp: serverTimestamp(),
      });

      alert("Attendance marked successfully ✅");
    } catch (err) {
      console.error(err);
      alert("Error marking attendance");
    } finally {
      setLoading(false);
    }
  };

  // ---------------- UI ----------------
  return (
    <div style={{ maxWidth: 500, margin: "30px auto" }}>
      <h2>Mark Attendance</h2>

      <button onClick={checkLocation}>Check Location</button>

      {distance && <p>Distance: {distance} km</p>}
      <p>{message}</p>

      <video ref={videoRef} width="320" height="240" autoPlay />
      <canvas
        ref={canvasRef}
        width="320"
        height="240"
        style={{ display: "none" }}
      />

      <button onClick={takeSelfie}>Take Selfie</button>

      {status === "Late" && (
        <textarea
          placeholder="Enter late reason"
          value={lateReason}
          onChange={(e) => setLateReason(e.target.value)}
          style={{ width: "100%", marginTop: 10 }}
        />
      )}

      <button onClick={markAttendance} disabled={loading}>
        {loading ? "Marking..." : "Mark Attendance"}
      </button>
    </div>
  );
}
