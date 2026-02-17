import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({ error, errorInfo });
    
    // Log to service
    if (window.errorTracking) {
      window.errorTracking.logError(error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h1 style={styles.title}>⚠️ Something went wrong</h1>
            <p style={styles.message}>
              We're sorry, but something unexpected happened.
            </p>
            {process.env.NODE_ENV === 'development' && (
              <details style={styles.details}>
                <summary>Error Details</summary>
                <pre style={styles.error}>{this.state.error?.toString()}</pre>
                <pre style={styles.stack}>{this.state.errorInfo?.componentStack}</pre>
              </details>
            )}
            <div style={styles.actions}>
              <button 
                onClick={() => window.location.reload()} 
                style={styles.button}
              >
                🔄 Refresh Page
              </button>
              <button 
                onClick={() => window.location.href = '/'} 
                style={{...styles.button, backgroundColor: '#666'}}
              >
                🏠 Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
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
    maxWidth: 600,
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  title: {
    color: '#d32f2f',
    marginBottom: 20
  },
  message: {
    color: '#666',
    marginBottom: 30
  },
  details: {
    marginTop: 20,
    textAlign: 'left',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 8
  },
  error: {
    color: '#d32f2f',
    fontSize: 12,
    overflow: 'auto',
    maxHeight: 200
  },
  stack: {
    fontSize: 11,
    color: '#666',
    marginTop: 10
  },
  actions: {
    display: 'flex',
    gap: 10,
    justifyContent: 'center',
    marginTop: 30
  },
  button: {
    padding: '10px 20px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14
  }
};

export default ErrorBoundary;