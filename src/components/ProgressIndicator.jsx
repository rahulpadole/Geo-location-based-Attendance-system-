import React, { useState, useEffect } from 'react';

const ProgressIndicator = ({ 
  isActive, 
  message = 'Loading...',
  showPercentage = false,
  indeterminate = true,
  value = 0,
  max = 100
}) => {
  const [progress, setProgress] = useState(value);

  useEffect(() => {
    if (indeterminate) {
      const interval = setInterval(() => {
        setProgress(prev => (prev + 1) % 100);
      }, 30);
      return () => clearInterval(interval);
    } else {
      setProgress(value);
    }
  }, [indeterminate, value]);

  if (!isActive) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.container}>
        <div style={styles.barContainer}>
          <div 
            style={{
              ...styles.bar,
              width: `${progress}%`,
              animation: indeterminate ? 'pulse 1s ease-in-out infinite' : 'none'
            }}
          />
        </div>
        <p style={styles.message}>{message}</p>
        {showPercentage && !indeterminate && (
          <p style={styles.percentage}>{Math.round((progress / max) * 100)}%</p>
        )}
      </div>
    </div>
  );
};

export const StepProgress = ({ steps, currentStep }) => {
  return (
    <div style={styles.stepContainer}>
      {steps.map((step, index) => {
        const status = index < currentStep ? 'completed' : 
                      index === currentStep ? 'current' : 'pending';
        
        return (
          <div key={index} style={styles.stepWrapper}>
            <div style={styles.stepIndicator}>
              <div style={{
                ...styles.stepDot,
                ...styles[`stepDot_${status}`]
              }}>
                {status === 'completed' ? '✓' : index + 1}
              </div>
              {index < steps.length - 1 && (
                <div style={{
                  ...styles.stepLine,
                  ...styles[`stepLine_${status}`]
                }} />
              )}
            </div>
            <div style={styles.stepLabel}>
              <span style={styles.stepName}>{step}</span>
            </div>
          </div>
        );
      })}
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
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10000
  },
  container: {
    width: 300,
    textAlign: 'center'
  },
  barContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10
  },
  bar: {
    height: '100%',
    backgroundColor: '#1976d2',
    transition: 'width 0.3s ease',
    borderRadius: 4
  },
  message: {
    color: '#666',
    margin: '10px 0 5px',
    fontSize: 14
  },
  percentage: {
    color: '#1976d2',
    fontWeight: 'bold',
    fontSize: 18,
    margin: 0
  },
  stepContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    maxWidth: 600,
    margin: '0 auto'
  },
  stepWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    position: 'relative'
  },
  stepIndicator: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10
  },
  stepDot: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: 14,
    fontWeight: 'bold',
    zIndex: 1,
    transition: 'all 0.3s ease'
  },
  stepDot_completed: {
    backgroundColor: '#2e7d32',
    color: '#fff'
  },
  stepDot_current: {
    backgroundColor: '#1976d2',
    color: '#fff',
    boxShadow: '0 0 0 3px rgba(25, 118, 210, 0.3)'
  },
  stepDot_pending: {
    backgroundColor: '#f5f5f5',
    border: '2px solid #ddd',
    color: '#999'
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: '#ddd',
    margin: '0 5px',
    transition: 'background-color 0.3s ease'
  },
  stepLine_completed: {
    backgroundColor: '#2e7d32'
  },
  stepLine_current: {
    backgroundColor: '#1976d2'
  },
  stepLine_pending: {
    backgroundColor: '#ddd'
  },
  stepLabel: {
    textAlign: 'center'
  },
  stepName: {
    fontSize: 12,
    color: '#666'
  }
};

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }
`;
document.head.appendChild(style);

export default ProgressIndicator;