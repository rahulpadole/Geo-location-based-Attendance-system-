import React from 'react';

export default function ConfirmDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = "Confirm", 
  cancelText = "Cancel",
  type = "danger"
}) {
  if (!isOpen) return null;

  const getColors = () => {
    switch(type) {
      case 'danger':
        return {
          confirmBg: '#d32f2f',
          confirmHover: '#b71c1c'
        };
      case 'warning':
        return {
          confirmBg: '#ed6c02',
          confirmHover: '#b26a00'
        };
      case 'info':
        return {
          confirmBg: '#1976d2',
          confirmHover: '#115293'
        };
      default:
        return {
          confirmBg: '#d32f2f',
          confirmHover: '#b71c1c'
        };
    }
  };

  const colors = getColors();

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <h3 style={styles.title}>{title}</h3>
        <p style={styles.message}>{message}</p>
        
        <div style={styles.actions}>
          <button 
            onClick={onClose} 
            style={styles.cancelButton}
          >
            {cancelText}
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }} 
            style={{
              ...styles.confirmButton,
              backgroundColor: colors.confirmBg,
              ':hover': {
                backgroundColor: colors.confirmHover
              }
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

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
    zIndex: 10000,
    backdropFilter: 'blur(3px)'
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
    color: '#333',
    fontSize: 18
  },
  message: {
    margin: '0 0 20px 0',
    color: '#666',
    lineHeight: 1.5
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
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 'bold'
  },
  confirmButton: {
    padding: '8px 16px',
    border: 'none',
    color: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 'bold'
  }
};