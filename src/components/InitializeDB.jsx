import { useState } from 'react';
import initializeDatabase from '../scripts/initDatabase';
import { useToast } from '../hooks/useToast';
import LoadingSpinner from './LoadingSpinner';
import { useNavigate } from 'react-router-dom';

export default function InitializeDB() {
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleInitialize = async () => {
    setLoading(true);
    try {
      const result = await initializeDatabase();
      
      if (result.success) {
        setInitialized(true);
        showToast(result.message, 'success');
        
        // Show credentials in a formatted way
        const credentials = `
          Database Initialized Successfully!
          
          ADMIN LOGIN:
          Email: ${result.admin.email}
          Password: ${result.admin.password}
          
          TEACHER LOGIN:
          Email: ${result.teacher.email}
          Password: ${result.teacher.password}
          
          Please save these credentials and change passwords after first login.
        `;
        
        alert(credentials);
        
        // Redirect to login after 2 seconds
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('Failed to initialize database', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (initialized) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={styles.successTitle}>✅ Database Initialized!</h2>
          <p>Redirecting to login page...</p>
          <LoadingSpinner size="small" />
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🚀 Geo Attendance System</h1>
        <h2 style={styles.subtitle}>Database Initialization</h2>
        
        <p style={styles.message}>
          Your database is empty. Click the button below to initialize it with default data.
        </p>
        
        <div style={styles.warningBox}>
          <strong>⚠️ This will create:</strong>
          <ul style={styles.list}>
            <li>1 Admin account</li>
            <li>1 Teacher account</li>
            <li>College settings (placeholder)</li>
            <li>Timetable (default working hours)</li>
            <li>Holidays (sample data)</li>
          </ul>
        </div>
        
        <button
          onClick={handleInitialize}
          disabled={loading}
          style={{
            ...styles.button,
            opacity: loading ? 0.6 : 1
          }}
        >
          {loading ? <LoadingSpinner size="small" /> : '🚀 Initialize Database'}
        </button>
        
        <p style={styles.note}>
          Note: You'll be redirected to login page after initialization.
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: 20
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 40,
    maxWidth: 500,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  title: {
    color: '#1976d2',
    marginBottom: 10
  },
  subtitle: {
    color: '#666',
    marginBottom: 30,
    fontWeight: 'normal'
  },
  message: {
    color: '#666',
    marginBottom: 20,
    lineHeight: 1.6
  },
  warningBox: {
    backgroundColor: '#fff3e0',
    border: '1px solid #ffb74d',
    borderRadius: 8,
    padding: 15,
    marginBottom: 25,
    textAlign: 'left'
  },
  list: {
    marginTop: 10,
    paddingLeft: 20,
    color: '#666'
  },
  button: {
    padding: '12px 24px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    width: '100%',
    marginBottom: 15
  },
  note: {
    color: '#999',
    fontSize: 12,
    marginTop: 10
  },
  successTitle: {
    color: '#2e7d32',
    marginBottom: 20
  }
};