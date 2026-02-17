import { auth, db } from "../services/firebase";
import { signOut, updatePassword } from "firebase/auth";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function AdminProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      const snap = await getDoc(doc(db, "users", auth.currentUser.uid));
      if (snap.exists()) setUser(snap.data());
    };
    loadProfile();
  }, []);

  const changePassword = async () => {
    if (newPassword.length < 6) return alert("Password must be at least 6 chars");
    try {
      setLoading(true);
      await updatePassword(auth.currentUser, newPassword);
      alert("✅ Password updated");
      setNewPassword("");
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 20, border: "1px solid #ddd", borderRadius: 8 }}>
      <button onClick={() => navigate(-1)} style={{ marginBottom: 20 }}>← Back</button>
      <h2>Admin Profile</h2>
      {user && (
        <div style={{ marginBottom: 20 }}>
          <p><b>Name:</b> {user.name}</p>
          <p><b>Position:</b> {user.position}</p>
          <p><b>Admin ID:</b> {user.adminId}</p>
          <p><b>Email:</b> {auth.currentUser.email}</p>
        </div>
      )}
      <div style={{ borderTop: "1px solid #eee", paddingTop: 20 }}>
        <h3>Change Password</h3>
        <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ padding: 8, width: "100%", marginBottom: 10 }} />
        <button onClick={changePassword} disabled={loading} style={{ padding: "10px 20px" }}>Update Password</button>
      </div>
      <button onClick={logout} style={{ marginTop: 20, padding: "10px 20px", background: "#f44336", color: "#fff", border: "none" }}>Logout</button>
    </div>
  );
}
