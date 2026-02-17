import React from 'react';

const ConfirmDialog = ({ isOpen, onClose, onConfirm, title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={e => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>
        
        <div style={styles.actions}>
          <button onClick={onClose} style={styles.cancelButton}>
            {cancelText}
          </button>
          <button onClick={onConfirm} style={styles.confirmButton}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000
  },
  dialog: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '90%',
    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
  },
  title: {
    margin: '0 0 10px 0',
    color: '#333'
  },
  message: {
    margin: '0 0 20px 0',
    color: '#666'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 10
  },
  cancelButton: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    borderRadius: 4,
    cursor: 'pointer'
  },
  confirmButton: {
    padding: '8px 16px',
    border: 'none',
    backgroundColor: '#d32f2f',
    color: '#fff',
    borderRadius: 4,
    cursor: 'pointer'
  }
};

export default ConfirmDialog;