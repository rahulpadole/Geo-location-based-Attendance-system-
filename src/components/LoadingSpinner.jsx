import React from 'react';

const LoadingSpinner = ({ size = 'medium', color = '#1976d2' }) => {
  const sizes = {
    small: 20,
    medium: 40,
    large: 60
  };

  const spinnerSize = sizes[size] || sizes.medium;

  return (
    <div style={styles.container}>
      <div
        style={{
          ...styles.spinner,
          width: spinnerSize,
          height: spinnerSize,
          borderColor: `${color}33`,
          borderTopColor: color
        }}
      />
    </div>
  );
};

export const FullPageLoader = () => {
  return (
    <div style={styles.fullPage}>
      <LoadingSpinner size="large" />
      <p style={styles.loadingText}>Loading...</p>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  spinner: {
    border: '3px solid',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  fullPage: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999
  },
  loadingText: {
    marginTop: 10,
    color: '#666'
  }
};

// Add animation
const style = document.createElement('style');
style.textContent = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);

export default LoadingSpinner;