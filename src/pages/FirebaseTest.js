import { useEffect, useState } from 'react';
import { db } from '../services/firebase';
import { collection, getDocs } from 'firebase/firestore';

export default function FirebaseTest() {
  const [status, setStatus] = useState('Testing connection...');
  const [error, setError] = useState(null);
  const [details, setDetails] = useState([]);

  useEffect(() => {
    testConnection();
  }, []);

  const addDetail = (message, type = 'info') => {
    setDetails(prev => [...prev, { message, type, timestamp: new Date().toLocaleTimeString() }]);
  };

  const testConnection = async () => {
    try {
      addDetail('🔍 Testing Firebase connection...');
      
      // Test 1: Check if Firebase is initialized
      addDetail('✅ Firebase initialized');
      
      // Test 2: Try to read from Firestore
      addDetail('📡 Attempting to read from Firestore...');
      const testQuery = await getDocs(collection(db, 'users'));
      
      addDetail(`✅ Success! Found ${testQuery.size} users in database`);
      setStatus(`✅ Connected! Found ${testQuery.size} users`);
      
      // Test 3: Check for ad-blocker
      if (window.chrome && window.chrome.runtime && window.chrome.runtime.id) {
        addDetail('⚠️ Ad-blocker or extension detected - may cause issues', 'warning');
      }
      
    } catch (err) {
      console.error('Firebase error:', err);
      setStatus('❌ Connection failed');
      setError(err.message);
      addDetail(`❌ Error: ${err.message}`, 'error');
      
      // Check for common issues
      if (err.message.includes('permission')) {
        addDetail('🔑 This looks like a permissions issue - check Firestore rules', 'warning');
      } else if (err.message.includes('network')) {
        addDetail('🌐 Network issue - check your connection or firewall', 'warning');
      }
    }
  };

  const getStatusColor = () => {
    if (status.includes('✅')) return '#2e7d32';
    if (status.includes('❌')) return '#d32f2f';
    return '#1976d2';
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Firebase Connection Test</h1>
      
      <div style={{ ...styles.statusCard, borderLeftColor: getStatusColor() }}>
        <p style={styles.statusText}>{status}</p>
        {error && <p style={styles.errorText}>Error: {error}</p>}
      </div>
      
      <div style={styles.detailsCard}>
        <h3 style={styles.detailsTitle}>Connection Details:</h3>
        <div style={styles.logContainer}>
          {details.map((detail, index) => (
            <div 
              key={index} 
              style={{
                ...styles.logEntry,
                backgroundColor: detail.type === 'error' ? '#ffebee' : 
                               detail.type === 'warning' ? '#fff3e0' : '#f5f5f5'
              }}
            >
              <span style={styles.logTime}>[{detail.timestamp}]</span>
              <span style={{
                color: detail.type === 'error' ? '#d32f2f' : 
                       detail.type === 'warning' ? '#ed6c02' : '#1976d2'
              }}>
                {detail.message}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      <div style={styles.tipsCard}>
        <h3 style={styles.tipsTitle}>🔧 Troubleshooting Steps:</h3>
        <ol style={styles.tipsList}>
          <li>Disable ad-blocker extensions (uBlock Origin, AdBlock, etc.)</li>
          <li>Check if browser is blocking trackers (click shield icon in address bar)</li>
          <li>Try in Incognito/Private mode</li>
          <li>Add firewall exception for firestore.googleapis.com</li>
          <li>Check if your network is blocking Google services</li>
          <li>Try a different browser (Chrome, Edge, or Firefox)</li>
        </ol>
      </div>

      <button 
        onClick={testConnection}
        style={styles.retryButton}
      >
        🔄 Retry Connection
      </button>

      <button 
        onClick={() => window.location.href = '/login'}
        style={styles.backButton}
      >
        ← Back to Login
      </button>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 700,
    margin: '40px auto',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif'
  },
  title: {
    textAlign: 'center',
    color: '#333',
    marginBottom: 30
  },
  statusCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginBottom: 20,
    borderLeft: '6px solid',
    borderLeftColor: '#1976d2'
  },
  statusText: {
    fontSize: 18,
    fontWeight: 'bold',
    margin: '0 0 10px 0'
  },
  errorText: {
    color: '#d32f2f',
    margin: 0,
    fontSize: 14,
    backgroundColor: '#ffebee',
    padding: '10px',
    borderRadius: 4
  },
  detailsCard: {
    backgroundColor: '#fff',
    padding: '20px',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginBottom: 20
  },
  detailsTitle: {
    margin: '0 0 15px 0',
    color: '#333'
  },
  logContainer: {
    maxHeight: 300,
    overflowY: 'auto',
    border: '1px solid #eee',
    borderRadius: 8
  },
  logEntry: {
    padding: '10px',
    borderBottom: '1px solid #eee',
    fontSize: 13,
    fontFamily: 'monospace'
  },
  logTime: {
    color: '#999',
    marginRight: '10px',
    fontSize: 11
  },
  tipsCard: {
    backgroundColor: '#e3f2fd',
    padding: '20px',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    marginBottom: 20,
    borderLeft: '4px solid #1976d2'
  },
  tipsTitle: {
    margin: '0 0 10px 0',
    color: '#1976d2'
  },
  tipsList: {
    margin: 0,
    paddingLeft: 20,
    color: '#333',
    lineHeight: 1.8
  },
  retryButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: 10
  },
  backButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#f5f5f5',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: 8,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};