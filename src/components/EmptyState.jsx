import React from 'react';

const EmptyState = ({ 
  icon = '📋', 
  title = 'No data found', 
  message = 'There are no records to display at this moment.',
  action,
  actionText = 'Add New'
}) => {
  return (
    <div style={styles.container}>
      <div style={styles.icon}>{icon}</div>
      <h3 style={styles.title}>{title}</h3>
      <p style={styles.message}>{message}</p>
      {action && (
        <button onClick={action} style={styles.button}>
          {actionText}
        </button>
      )}
    </div>
  );
};

const styles = {
  container: {
    textAlign: 'center',
    padding: '40px 20px',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    border: '1px dashed #ddd'
  },
  icon: {
    fontSize: 48,
    marginBottom: 20,
    opacity: 0.5
  },
  title: {
    margin: '0 0 10px 0',
    color: '#666'
  },
  message: {
    margin: '0 0 20px 0',
    color: '#999'
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    cursor: 'pointer'
  }
};

export default EmptyState;