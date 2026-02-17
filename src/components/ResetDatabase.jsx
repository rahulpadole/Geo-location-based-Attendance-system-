import { useState } from 'react';
import { resetDatabase } from '../scripts/resetDatabase';
import { useToast } from '../hooks/useToast';
import LoadingSpinner from './LoadingSpinner';

export default function ResetDatabaseButton() {
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const handleReset = async () => {
    setLoading(true);
    try {
      const result = await resetDatabase();
      
      if (result.success) {
        showToast(result.message, 'success');
        // Display credentials
        const credentials = `
          Admin: ${result.admin.email} / ${result.admin.password}
          Teacher: ${result.teacher.email} / ${result.teacher.password}
        `;
        alert(`Database Reset Complete!\n\nDefault Credentials:\n${credentials}`);
      } else {
        showToast(result.error, 'error');
      }
    } catch (error) {
      showToast('Failed to reset database', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleReset}
      disabled={loading}
      style={{
        padding: '10px 20px',
        backgroundColor: '#d32f2f',
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.6 : 1,
        margin: '10px',
        fontWeight: 'bold'
      }}
    >
      {loading ? <LoadingSpinner size="small" /> : '🔄 Reset Database'}
    </button>
  );
}