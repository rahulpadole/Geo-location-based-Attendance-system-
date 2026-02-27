import { useState } from 'react';
import { auth, db } from '../services/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

export default function DatabaseSetup() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const setupDatabase = async () => {
    setLoading(true);
    setMessage('Creating admin account...');

    try {
      // Step 1: Create Admin in Firebase Auth
      const adminCredential = await createUserWithEmailAndPassword(
        auth,
        'admin@geoattendance.com',
        'Admin@123'
      );

      setMessage('Creating admin profile...');

      // Step 2: Create Admin document in Firestore
      await setDoc(doc(db, 'users', adminCredential.user.uid), {
        email: 'admin@geoattendance.com',
        name: 'System Administrator',
        adminId: 'ADMIN001',
        designation: 'Chief Administrator',
        department: 'Administration',
        phone: '+1234567890',
        role: 'admin',
        isActive: true,
        createdAt: new Date(),
        uid: adminCredential.user.uid
      });

      setMessage('Creating teacher account...');

      // Step 3: Create Teacher in Firebase Auth
      const teacherCredential = await createUserWithEmailAndPassword(
        auth,
        'teacher@geoattendance.com',
        'Teacher@123'
      );

      setMessage('Creating teacher profile...');

      // Step 4: Create Teacher document in Firestore
      await setDoc(doc(db, 'users', teacherCredential.user.uid), {
        email: 'teacher@geoattendance.com',
        name: 'John Teacher',
        employeeId: 'TCH001',
        department: 'Computer Science',
        designation: 'Senior Lecturer',
        phone: '+1234567891',
        role: 'teacher',
        isActive: true,
        joiningDate: new Date().toISOString().split('T')[0],
        createdAt: new Date(),
        uid: teacherCredential.user.uid
      });

      setMessage('Creating college settings...');

      // Step 5: Create College Settings
      await setDoc(doc(db, 'collegeSettings', 'main'), {
        latitude: 0,
        longitude: 0,
        radius: 150,
        updatedAt: new Date()
      });

      setMessage('Creating timetable...');

      // Step 6: Create Timetable
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      for (const day of days) {
        await setDoc(doc(db, 'timetable', day), {
          startTime: '09:00',
          lateAfter: '09:15',
          endTime: day === 'saturday' ? '13:00' : '17:00'
        });
      }

      setMessage('Creating holidays...');

      // Step 7: Create Holidays
      const holidays = [
        {
          name: "New Year's Day",
          date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
          type: "holiday",
          description: "New Year Holiday"
        },
        {
          name: "Independence Day",
          date: new Date(new Date().getFullYear(), 7, 15).toISOString().split('T')[0],
          type: "holiday",
          description: "Independence Day"
        },
        {
          name: "Christmas",
          date: new Date(new Date().getFullYear(), 11, 25).toISOString().split('T')[0],
          type: "holiday",
          description: "Christmas Day"
        }
      ];

      for (const holiday of holidays) {
        await setDoc(doc(db, 'holidays', `holiday_${Date.now()}_${Math.random()}`), {
          ...holiday,
          createdAt: new Date()
        });
      }

      setMessage('✅ Database setup complete!');
      setStep(2);

    } catch (error) {
      console.error('Setup error:', error);
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>🚀 Geo Attendance System</h1>
        <h2 style={styles.subtitle}>Database Setup</h2>

        {step === 1 && (
          <>
            <p style={styles.message}>
              No database found. Click the button below to create your database with default data.
            </p>

            <div style={styles.infoBox}>
              <h3 style={styles.infoTitle}>📋 This will create:</h3>
              <ul style={styles.list}>
                <li>✅ Admin account: admin@geoattendance.com / Admin@123</li>
                <li>✅ Teacher account: teacher@geoattendance.com / Teacher@123</li>
                <li>✅ College settings (placeholder values)</li>
                <li>✅ Timetable for all days</li>
                <li>✅ Sample holidays</li>
              </ul>
            </div>

            <button
              onClick={setupDatabase}
              disabled={loading}
              style={{
                ...styles.button,
                opacity: loading ? 0.6 : 1
              }}
            >
              {loading ? <LoadingSpinner size="small" /> : '🛠️ Create Database'}
            </button>

            {message && (
              <p style={styles.status}>{message}</p>
            )}
          </>
        )}

        {step === 2 && (
          <>
            <div style={styles.successBox}>
              <h3 style={styles.successTitle}>✅ Database Created Successfully!</h3>
              <p style={styles.successMessage}>
                Your database is now ready to use.
              </p>
            </div>

            <div style={styles.credentialsBox}>
              <h4 style={styles.credentialsTitle}>📝 Default Credentials:</h4>
              
              <div style={styles.credentialItem}>
                <strong>Admin:</strong><br />
                Email: admin@geoattendance.com<br />
                Password: Admin@123
              </div>
              
              <div style={styles.credentialItem}>
                <strong>Teacher:</strong><br />
                Email: teacher@geoattendance.com<br />
                Password: Teacher@123
              </div>
              
              <p style={styles.warning}>
                ⚠️ Please change these passwords after first login!
              </p>
            </div>

            <button
              onClick={goToLogin}
              style={styles.loginButton}
            >
              🔐 Go to Login
            </button>
          </>
        )}
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
    width: '100%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
  },
  title: {
    color: '#1976d2',
    textAlign: 'center',
    marginBottom: 10
  },
  subtitle: {
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    fontWeight: 'normal'
  },
  message: {
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 1.6
  },
  infoBox: {
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    padding: 20,
    marginBottom: 25
  },
  infoTitle: {
    color: '#1976d2',
    marginTop: 0,
    marginBottom: 10
  },
  list: {
    margin: 0,
    paddingLeft: 20,
    color: '#555',
    lineHeight: 1.8
  },
  button: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: 15
  },
  status: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10
  },
  successBox: {
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
    padding: 20,
    marginBottom: 20,
    textAlign: 'center'
  },
  successTitle: {
    color: '#2e7d32',
    marginTop: 0,
    marginBottom: 10
  },
  successMessage: {
    color: '#555',
    margin: 0
  },
  credentialsBox: {
    backgroundColor: '#fff3e0',
    borderRadius: 8,
    padding: 20,
    marginBottom: 25
  },
  credentialsTitle: {
    color: '#ed6c02',
    marginTop: 0,
    marginBottom: 15
  },
  credentialItem: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    border: '1px solid #ffe0b2',
    fontSize: 14
  },
  warning: {
    color: '#d32f2f',
    fontSize: 13,
    marginTop: 10,
    marginBottom: 0,
    fontStyle: 'italic'
  },
  loginButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#2e7d32',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    fontWeight: 'bold',
    cursor: 'pointer'
  }
};