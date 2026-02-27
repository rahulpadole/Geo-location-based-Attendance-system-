import React from 'react';

export default function CreateIndexButton() {
  const handleCreateIndex = () => {
    window.open(
      'https://console.firebase.google.com/v1/r/project/geo-attendance-3c37e/firestore/indexes?create_composite=Cldwcm9qZWN0cy9nZW8tYXR0ZW5kYW5jZS0zYzM3ZS9kYXRhYmFzZXMvKGRlZmF1bHQpL2NvbGxlY3Rpb25Hcm91cHMvYXR0ZW5kYW5jZS9pbmRleGVzL18QARoKCgZ1c2VySWQQARoICgRkYXRlEAIaDAoIX19uYW1lX18QAg',
      '_blank'
    );
  };

  return (
    <button
      onClick={handleCreateIndex}
      style={{
        padding: '8px 16px',
        backgroundColor: '#1976d2',
        color: '#fff',
        border: 'none',
        borderRadius: 4,
        cursor: 'pointer',
        fontSize: 14,
        marginLeft: 10
      }}
    >
      🔧 Create Required Index
    </button>
  );
}