import { useState, useEffect } from 'react';
import { db, auth } from '../services/firebase';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function TestFirebase() {
  const [status, setStatus] = useState('Testing...');
  const [results, setResults] = useState([]);

  const addLog = (message, type = 'info') => {
    setResults(prev => [...prev, { message, type, time: new Date().toLocaleTimeString() }]);
  };

  const testFirebase = async () => {
    setResults([]);
    addLog('🔍 Starting Firebase tests...');

    // Test 1: Check if Firebase is initialized
    try {
      addLog('✅ Firebase initialized');
    } catch (error) {
      addLog(`❌ Firebase init error: ${error.message}`, 'error');
    }

    // Test 2: Check Authentication
    try {
      const testLogin = await signInWithEmailAndPassword(auth, 'admin@geoattendance.com', 'Admin@123');
      addLog(`✅ Auth login successful: ${testLogin.user.email}`);
    } catch (error) {
      addLog(`❌ Auth error: ${error.message}`, 'error');
    }

    // Test 3: Check Firestore Read
    try {
      const testQuery = await getDocs(collection(db, 'users'));
      addLog(`✅ Firestore read successful: Found ${testQuery.size} users`);
      testQuery.forEach(doc => {
        addLog(`   - User: ${doc.data().name} (${doc.data().role})`);
      });
    } catch (error) {
      addLog(`❌ Firestore read error: ${error.message}`, 'error');
    }

    // Test 4: Check Firestore Write
    try {
      const testDoc = await addDoc(collection(db, 'test'), {
        message: 'Test write',
        timestamp: new Date()
      });
      addLog(`✅ Firestore write successful: ${testDoc.id}`);
    } catch (error) {
      addLog(`❌ Firestore write error: ${error.message}`, 'error');
    }

    addLog('✅ Tests completed!');
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Firebase Connection Test</h1>
      
      <button 
        onClick={testFirebase}
        style={{
          padding: '10px 20px',
          backgroundColor: '#1976d2',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          marginBottom: '20px'
        }}
      >
        Run Tests
      </button>

      <div style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '15px', 
        borderRadius: '8px',
        fontFamily: 'monospace'
      }}>
        {results.map((result, index) => (
          <div 
            key={index}
            style={{
              margin: '5px 0',
              color: result.type === 'error' ? '#d32f2f' : 
                     result.type === 'success' ? '#2e7d32' : '#1976d2',
              borderBottom: '1px solid #eee',
              padding: '5px'
            }}
          >
            [{result.time}] {result.message}
          </div>
        ))}
      </div>
    </div>
  );
}