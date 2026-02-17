import { useState } from "react";
import { auth } from "../services/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleReset = async () => {
    if (!email) return alert("Please enter your email");
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      alert(`✅ Password reset email sent to ${email}`);
      navigate("/login"); // redirect to login
    } catch (err) {
      console.error(err);
      alert("❌ Error sending reset email: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <h2>Forgot Password</h2>
      <p>Enter your registered email to reset your password</p>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ width: "100%", padding: 8, marginBottom: 10 }}
      />

      <button onClick={handleReset} disabled={loading} style={{ width: "100%", padding: 10 }}>
        {loading ? "Sending..." : "Send Reset Email"}
      </button>
    </div>
  );
}
