import React from 'react';

const ResponsiveLayout = ({ children, maxWidth = 1200 }) => {
  return (
    <div style={styles.container}>
      <div style={{ ...styles.content, maxWidth }}>
        {children}
      </div>
    </div>
  );
};

export const Grid = ({ children, columns = 1, gap = 20 }) => {
  return (
    <div
      style={{
        ...styles.grid,
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap
      }}
    >
      {children}
    </div>
  );
};

export const Card = ({ children, padding = 20, ...props }) => {
  return (
    <div style={{ ...styles.card, padding }} {...props}>
      {children}
    </div>
  );
};

const styles = {
  container: {
    width: '100%',
    padding: '0 20px',
    boxSizing: 'border-box'
  },
  content: {
    margin: '0 auto',
    width: '100%'
  },
  grid: {
    display: 'grid',
    width: '100%'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
  }
};

// Media query helper
export const useMediaQuery = (query) => {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

export default ResponsiveLayout;