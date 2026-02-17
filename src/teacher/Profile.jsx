import { useEffect, useState } from "react";
import { auth, db } from "../services/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { signOut, deleteUser, updatePassword } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function TeacherProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [contact, setContact] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const uid = auth.currentUser.uid;

  useEffect(() => {
    // ... load profile code already there
  }, [uid]);

  const changePassword = async () => {
    if (newPassword.length < 6) return alert("Password must be at least 6 characters");
    try {
      setLoading(true);
      await updatePassword(auth.currentUser, newPassword);
      alert("✅ Password updated successfully");
      setNewPassword("");
    } catch (err) {
      alert("❌ Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) {
          setUser(snap.data());
          setContact(snap.data().contact || "");
        } else {
          alert("User not found");
        }
      } catch (err) {
        console.error(err);
        alert("Failed to load profile: " + err.message);
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, [uid]);

  const updateProfile = async () => {
    if (!contact) return alert("Please enter a valid contact number");
    try {
      setLoading(true);
      await updateDoc(doc(db, "users", uid), { contact });
      alert("✅ Profile updated successfully");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to update profile: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("Failed to logout: " + err.message);
      setLoading(false);
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm("Delete your account? Your attendance data will remain.")) return;

    try {
      setLoading(true);
      await deleteUser(auth.currentUser);
      alert("✅ Account deleted");
      navigate("/login");
    } catch (err) {
      console.error(err);
      alert("❌ Failed to delete account: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !user) return <p style={{ textAlign: "center", marginTop: 40 }}>Loading profile...</p>;
  if (!user) return <p style={{ textAlign: "center", marginTop: 40 }}>User not found</p>;

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: "0 20px" }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ marginBottom: 20, padding: "8px 16px", cursor: "pointer", borderRadius: 4, border: "1px solid #ccc", background: "#f9f9f9" }}
      >
        ← Back
      </button>
      <div style={{ border: "1px solid #ddd", padding: 30, borderRadius: 12, boxShadow: "0 4px 10px rgba(0,0,0,0.1)", background: "#fff" }}>
        <h2 style={{ textAlign: "center", marginBottom: 20 }}>My Profile</h2>
        <div style={{ marginBottom: 15 }}>
          <p><b>Name:</b> {user.name}</p>
          <p><b>Email:</b> {user.email || auth.currentUser.email}</p>
          <p><b>Department:</b> {user.department}</p>
          <p><b>Employee ID:</b> {user.employeeId || "-"}</p>
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={{ display: "block", marginBottom: 8 }}><b>Contact Number:</b></label>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            style={{ width: "100%", padding: 10, borderRadius: 4, border: "1px solid #ccc", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ borderTop: "1px solid #eee", marginTop: 20, paddingTop: 20 }}>
          <h3>Change Password</h3>
          <input
            type="password"
            placeholder="New Password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ width: "100%", padding: 10, marginBottom: 10, borderRadius: 4, border: "1px solid #ccc" }}
          />
          <button 
            onClick={changePassword} 
            disabled={loading}
            style={{ padding: 10, cursor: "pointer", backgroundColor: "#2e7d32", color: "#fff", border: "none", borderRadius: 4, width: "100%" }}
          >
            Update Password
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
          <button 
            onClick={updateProfile} 
            disabled={loading} 
            style={{ padding: 10, cursor: "pointer", backgroundColor: "#1976d2", color: "#fff", border: "none", borderRadius: 4, fontWeight: "bold" }}
          >
            {loading ? "Updating..." : "Update Profile"}
          </button>
          <button 
            onClick={logout} 
            disabled={loading}
            style={{ padding: 10, cursor: "pointer", backgroundColor: "#f5f5f5", border: "1px solid #ccc", borderRadius: 4, fontWeight: "bold" }}
          >
            Logout
          </button>
          <button 
            onClick={deleteAccount} 
            disabled={loading} 
            style={{ padding: 10, cursor: "pointer", backgroundColor: "transparent", color: "#d32f2f", border: "none", fontWeight: "bold", fontSize: "0.9rem" }}
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
}
