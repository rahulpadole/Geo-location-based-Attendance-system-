import React, { createContext, useContext, useState, useCallback } from 'react';

export const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type, duration }]);
    
    setTimeout(() => {
      setToasts(prev => prev.filter(toast => toast.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, onClose }) => {
  return (
    <div style={styles.container}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            ...styles.toast,
            ...styles[toast.type]
          }}
          onClick={() => onClose(toast.id)}
        >
          <span>{toast.message}</span>
          <button style={styles.closeButton}>×</button>
        </div>
      ))}
    </div>
  );
};

const styles = {
  container: {
    position: 'fixed',
    top: 20,
    right: 20,
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: 10
  },
  toast: {
    padding: '12px 20px',
    borderRadius: 8,
    color: '#fff',
    cursor: 'pointer',
    minWidth: 250,
    maxWidth: 400,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    animation: 'slideIn 0.3s ease'
  },
  info: {
    backgroundColor: '#1976d2'
  },
  success: {
    backgroundColor: '#2e7d32'
  },
  error: {
    backgroundColor: '#d32f2f'
  },
  warning: {
    backgroundColor: '#ed6c02'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: 20,
    cursor: 'pointer',
    padding: '0 5px'
  }
};

// Add animation
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(100%);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
`;
document.head.appendChild(style);