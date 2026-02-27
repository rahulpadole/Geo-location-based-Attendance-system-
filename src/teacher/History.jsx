import { useEffect, useState, useCallback } from "react";
import { auth, db } from "../services/firebase";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/useToast";
import LoadingSpinner from "../components/LoadingSpinner";
import Pagination from "../components/Pagination";
import attendanceService from "../services/attendanceService";
import { DEFAULTS } from "../constants";

export default function History() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [error, setError] = useState(null);
  const [usingSimpleQuery, setUsingSimpleQuery] = useState(false);

  const loadHistory = useCallback(async (page) => {
    setLoading(true);
    setError(null);
    
    try {
      const user = auth.currentUser;
      if (!user) {
        navigate('/login');
        return;
      }

      console.log(`Loading history for user: ${user.uid}, page: ${page}`);
      
      // Use the new method with automatic fallback
      const result = await attendanceService.getAttendanceHistoryWithFallback(
        user.uid, 
        page, 
        DEFAULTS.PAGINATION_LIMIT || 20
      );
      
      // Check if we're using simple query (no pagination)
      if (result.totalPages === 1 && result.total > DEFAULTS.PAGINATION_LIMIT) {
        setUsingSimpleQuery(true);
        showToast("Using basic view while index builds", "info");
      } else {
        setUsingSimpleQuery(false);
      }
      
      console.log("History result:", result);
      
      setRecords(result.records || []);
      setTotalPages(result.totalPages || 1);
      setTotalRecords(result.total || 0);
      setCurrentPage(result.page || 1);
      
      if (result.records.length === 0) {
        showToast("No attendance records found", "info");
      }
      
    } catch (error) {
      console.error("History error details:", error);
      setError(error.message);
      showToast(error.message || "Failed to load attendance history", "error");
    } finally {
      setLoading(false);
    }
  }, [navigate, showToast]);

  useEffect(() => {
    loadHistory(currentPage);
  }, [currentPage, loadHistory]);

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const formatTimeOnly = (timestamp) => {
    if (!timestamp) return "-";
    
    try {
      if (timestamp?.toDate) {
        return timestamp.toDate().toLocaleTimeString();
      } else if (timestamp instanceof Date) {
        return timestamp.toLocaleTimeString();
      } else if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleTimeString();
      }
      return "-";
    } catch (e) {
      return "-";
    }
  };

  const getStatusStyle = (status) => {
    switch(status?.toLowerCase()) {
      case 'present':
        return { color: '#2e7d32', fontWeight: 'bold' };
      case 'late':
        return { color: '#ed6c02', fontWeight: 'bold' };
      case 'absent':
        return { color: '#d32f2f', fontWeight: 'bold' };
      case 'half day':
        return { color: '#1976d2', fontWeight: 'bold' };
      case 'leave':
        return { color: '#9c27b0', fontWeight: 'bold' };
      default:
        return {};
    }
  };

  if (loading && records.length === 0) {
    return (
      <div style={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <p style={styles.loadingText}>Loading your attendance history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.container}>
        <button onClick={() => navigate(-1)} style={styles.backButton}>
          ← Back
        </button>
        <div style={styles.errorContainer}>
          <h3 style={styles.errorTitle}>❌ Error Loading History</h3>
          <p style={styles.errorMessage}>{error}</p>
          <button 
            onClick={() => loadHistory(1)} 
            style={styles.retryButton}
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>
        ← Back
      </button>
      
      <h2 style={styles.title}>
        Attendance History {totalRecords > 0 && `(${totalRecords} records)`}
      </h2>

      {usingSimpleQuery && (
        <div style={styles.infoBanner}>
          <span>⚠️</span>
          <span>Database index is being built. Showing all records (paginated view coming soon).</span>
          <a 
            href="https://console.firebase.google.com/v1/r/project/geo-attendance-3c37e/firestore/indexes?create_composite=Cldwcm9qZWN0cy9nZW8tYXR0ZW5kYW5jZS0zYzM3ZS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYXR0ZW5kYW5jZS9pbmRleGVzL18QARoKCgZ1c2VySWQQARoICgRkYXRlEAIaDAoIX19uYW1lX18QAg"
            target="_blank"
            rel="noopener noreferrer"
            style={styles.indexLink}
          >
            Create Index
          </a>
        </div>
      )}

      {records.length === 0 ? (
        <div style={styles.emptyState}>
          <p style={styles.emptyIcon}>📋</p>
          <h3 style={styles.emptyTitle}>No Attendance Records Found</h3>
          <p style={styles.emptyMessage}>
            You haven't marked any attendance yet. 
            Go to the attendance page to mark your first attendance.
          </p>
          <button 
            onClick={() => navigate('/teacher/attendance')}
            style={styles.markButton}
          >
            📍 Mark Attendance
          </button>
        </div>
      ) : (
        <>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead style={styles.thead}>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>In Time</th>
                  <th style={styles.th}>Out Time</th>
                  <th style={styles.th}>Status</th>
                  
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} style={styles.tr}>
                    <td style={styles.td}>{record.date || '-'}</td>
                    <td style={styles.td}>{formatTimeOnly(record.inTime)}</td>
                    <td style={styles.td}>{formatTimeOnly(record.outTime)}</td>
                    <td style={{...styles.td, ...getStatusStyle(record.status)}}>
                      {record.status || '-'}
                    </td>
                    
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {totalPages > 1 && !usingSimpleQuery && (
            <>
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
              <p style={styles.stats}>
                Showing page {currentPage} of {totalPages} • {totalRecords} total records
              </p>
            </>
          )}
          
          {usingSimpleQuery && (
            <p style={styles.stats}>
              Showing all {totalRecords} records (sorted by date)
            </p>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 1200,
    margin: "30px auto",
    padding: "0 20px"
  },
  loadingContainer: {
    textAlign: "center",
    padding: "60px 20px"
  },
  loadingText: {
    marginTop: "20px",
    color: "#666"
  },
  backButton: {
    marginBottom: 20,
    padding: "8px 16px",
    cursor: "pointer",
    borderRadius: 4,
    border: "1px solid #ccc",
    background: "#f9f9f9",
    fontSize: 14
  },
  title: {
    textAlign: "center",
    marginBottom: 30,
    color: "#333"
  },
  infoBanner: {
    backgroundColor: "#fff3e0",
    border: "1px solid #ffb74d",
    borderRadius: 8,
    padding: "12px 16px",
    marginBottom: 20,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flexWrap: "wrap"
  },
  indexLink: {
    color: "#1976d2",
    textDecoration: "none",
    fontWeight: "bold",
    marginLeft: "auto",
    ":hover": {
      textDecoration: "underline"
    }
  },
  errorContainer: {
    textAlign: "center",
    padding: 40,
    backgroundColor: "#ffebee",
    borderRadius: 12,
    border: "1px solid #ffcdd2"
  },
  errorTitle: {
    color: "#d32f2f",
    marginBottom: 10
  },
  errorMessage: {
    color: "#666",
    marginBottom: 20
  },
  retryButton: {
    padding: "10px 20px",
    backgroundColor: "#1976d2",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    cursor: "pointer",
    fontSize: 14
  },
  emptyState: {
    textAlign: "center",
    padding: 60,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    border: "2px dashed #ddd"
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 20,
    opacity: 0.5
  },
  emptyTitle: {
    color: "#666",
    marginBottom: 10
  },
  emptyMessage: {
    color: "#999",
    marginBottom: 20,
    maxWidth: 400,
    margin: "0 auto 20px"
  },
  markButton: {
    padding: "12px 24px",
    backgroundColor: "#2e7d32",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 16,
    fontWeight: "bold"
  },
  tableContainer: {
    overflowX: "auto",
    backgroundColor: "#fff",
    borderRadius: 8,
    boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
    marginBottom: 20
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 700
  },
  thead: {
    background: "#f4f4f4"
  },
  th: {
    padding: 12,
    textAlign: "left",
    fontWeight: "bold",
    borderBottom: "2px solid #ddd"
  },
  tr: {
    borderBottom: "1px solid #eee"
  },
  td: {
    padding: 12,
    textAlign: "left",
    verticalAlign: "middle"
  },
  stats: {
    textAlign: "center",
    marginTop: 10,
    color: "#666",
    fontSize: 14
  }
};