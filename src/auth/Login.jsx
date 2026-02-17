import { useState, useEffect, useRef } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { useNavigate, Link } from "react-router-dom";
import { auth, db } from "../services/firebase";
import "./Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const hasNavigated = useRef(false);

  /* ---------------- CHECK IF ALREADY LOGGED IN ---------------- */
  useEffect(() => {
    let isMounted = true;

    const checkAuthState = async () => {
      const user = auth.currentUser;
      if (!user || hasNavigated.current || !isMounted) return;

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists() || !isMounted) return;

        const userData = snap.data();
        
        if (userData.role === "admin") {
          hasNavigated.current = true;
          navigate("/admin/dashboard", { replace: true });
        } else if (userData.role === "teacher") {
          hasNavigated.current = true;
          navigate("/teacher/dashboard", { replace: true });
        }
      } catch (err) {
        console.error("Error checking user role:", err);
      }
    };

    checkAuthState();

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const getErrorMessage = (err) => {
    if (!err) return "Login failed. Please try again.";
    switch (err.code) {
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/wrong-password":
        return "Incorrect password.";
      case "auth/invalid-email":
        return "Invalid email address.";
      case "auth/too-many-requests":
        return "Too many failed attempts. Try again later.";
      case "auth/invalid-credential":
        return "Invalid email or password.";
      case "auth/network-request-failed":
        return "Network error. Please check your connection.";
      default:
        return err.message || "Login failed.";
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    hasNavigated.current = false;

    try {
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password
      );

      const uid = userCredential.user.uid;
      const userSnap = await getDoc(doc(db, "users", uid));

      if (!userSnap.exists()) {
        throw new Error("User record not found. Please contact admin.");
      }

      const userData = userSnap.data();

      if (userData.isActive === false) {
        throw new Error("Your account is inactive. Contact admin.");
      }

      if (userData.role !== role) {
        throw new Error(
          `You are registered as ${userData.role}. Select correct role.`
        );
      }

      // Navigate based on role
      const dashboardPath = userData.role === "admin" ? "/admin/dashboard" : "/teacher/dashboard";
      hasNavigated.current = true;
      navigate(dashboardPath, { replace: true });
      
    } catch (err) {
      console.error("Login error:", err);
      setError(getErrorMessage(err));
      hasNavigated.current = false;
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <form className="login-card" onSubmit={handleLogin}>
        <h2 className="login-title">Geo Attendance System</h2>

        <div className="form-group">
          <label htmlFor="login-email">Email</label>
          <input
            id="login-email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="Enter your email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <div style={{ position: "relative" }}>
            <input
              id="login-password"
              name="password"
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="password-toggle"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontSize: "18px",
              }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Login As</label>
          <div style={{ display: 'flex', gap: '20px', marginTop: '5px' }}>
            <label htmlFor="role-teacher" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                id="role-teacher"
                name="role"
                type="radio"
                value="teacher"
                checked={role === "teacher"}
                onChange={(e) => setRole(e.target.value)}
              />
              Teacher
            </label>
            <label htmlFor="role-admin" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <input
                id="role-admin"
                name="role"
                type="radio"
                value="admin"
                checked={role === "admin"}
                onChange={(e) => setRole(e.target.value)}
              />
              Admin
            </label>
          </div>
        </div>

        {error && (
          <div className="error-text">
            {error}
          </div>
        )}

        <button 
          type="submit" 
          disabled={loading}
          className="login-button"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <div style={{ marginTop: 15, textAlign: 'center' }}>
          <Link to="/forgot-password" className="forgot-link">
            Forgot Password?
          </Link>
        </div>
      </form>
    </div>
  );
}