import React from "react";
import { useNavigate, useLocation } from "react-router-dom";

/**
 * Reusable Back Button Component
 * - Automatically navigates to previous page
 * - If no history, redirects to fallback path
 * - Optional custom label
 */

const BackButton = ({
  label = "Back",
  fallbackPath = "/admin/dashboard",
  className = "",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    // If user has browser history, go back
    if (window.history.state && window.history.state.idx > 0) {
      navigate(-1);
    } else {
      // If no history (direct page load), go to fallback
      navigate(fallbackPath);
    }
  };

  return (
    <div style={{ marginBottom: "15px" }}>
      <button
        onClick={handleBack}
        className={`back-btn ${className}`}
        style={{
          padding: "8px 14px",
          backgroundColor: "#1e293b",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: "14px",
        }}
      >
        ← {label}
      </button>
    </div>
  );
};

export default BackButton;
