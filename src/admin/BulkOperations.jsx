import { useState } from 'react';
import { collection, addDoc, writeBatch, doc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useToast } from '../hooks/useToast';  // This should now work
import LoadingSpinner from '../components/LoadingSpinner';
import { COLLECTIONS } from '../constants';

export default function BulkOperations() {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [operation, setOperation] = useState('markAttendance');
  const { showToast } = useToast();

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setFile(file);
  };

  const processBulkAttendance = async (data) => {
    const batch = writeBatch(db);
    const today = new Date().toISOString().split('T')[0];
    
    data.forEach(record => {
      const docId = `${record.userId}_${today}`;
      const ref = doc(db, COLLECTIONS.ATTENDANCE, docId);
      batch.set(ref, {
        ...record,
        date: today,
        createdAt: new Date()
      }, { merge: true });
    });
    
    await batch.commit();
  };

  const processBulkUpload = async () => {
    if (!file) {
      showToast('Please select a file', 'error');
      return;
    }

    setLoading(true);
    try {
      const text = await file.text();
      const rows = text.split('\n').map(row => row.split(','));
      const headers = rows[0];
      const data = rows.slice(1).map(row => {
        const obj = {};
        headers.forEach((header, i) => {
          obj[header.trim()] = row[i]?.trim();
        });
        return obj;
      });

      switch (operation) {
        case 'markAttendance':
          await processBulkAttendance(data);
          break;
        // Add other bulk operations
        default:
          throw new Error('Invalid operation');
      }

      showToast('Bulk operation completed successfully', 'success');
    } catch (error) {
      console.error('Bulk operation error:', error);
      showToast(error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2>Bulk Operations</h2>
      
      <div style={styles.form}>
        <div style={styles.formGroup}>
          <label>Operation Type</label>
          <select 
            value={operation} 
            onChange={(e) => setOperation(e.target.value)}
            style={styles.select}
          >
            <option value="markAttendance">Mark Attendance</option>
            <option value="addTeachers">Add Teachers</option>
            <option value="markLeave">Mark Leave</option>
          </select>
        </div>
        
        <div style={styles.formGroup}>
          <label>CSV File</label>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            style={styles.fileInput}
          />
          <small>Download sample format below</small>
        </div>
        
        <button
          onClick={processBulkUpload}
          disabled={loading || !file}
          style={styles.button}
        >
          {loading ? <LoadingSpinner size="small" /> : 'Process Bulk Upload'}
        </button>
      </div>
      
      <div style={styles.sample}>
        <h3>Sample CSV Format</h3>
        <pre>
          userId,status,lateReason,department<br/>
          user123,Present,,CS<br/>
          user456,Late,Traffic,IT<br/>
          user789,Absent,,ME
        </pre>
        <a 
          href="/sample.csv" 
          download
          style={styles.downloadLink}
        >
          Download Sample CSV
        </a>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 600,
    margin: '30px auto',
    padding: 20
  },
  form: {
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderRadius: 12,
    marginTop: 20
  },
  formGroup: {
    marginBottom: 15
  },
  select: {
    width: '100%',
    padding: 10,
    borderRadius: 6,
    border: '1px solid #ccc',
    marginTop: 5
  },
  fileInput: {
    width: '100%',
    padding: 10,
    border: '1px dashed #ccc',
    borderRadius: 6,
    marginTop: 5
  },
  button: {
    width: '100%',
    padding: 12,
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer'
  },
  sample: {
    marginTop: 30,
    padding: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 12
  },
  downloadLink: {
    display: 'inline-block',
    marginTop: 10,
    color: '#1976d2',
    textDecoration: 'none'
  }
};