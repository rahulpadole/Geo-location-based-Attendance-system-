import React from 'react';

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 2; i <= currentPage + 2; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    
    return pages;
  };

  return (
    <div style={styles.container}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        style={{...styles.button, ...styles.prevNext}}
      >
        ← Previous
      </button>
      
      {getPageNumbers().map((page, index) => (
        <button
          key={index}
          onClick={() => typeof page === 'number' ? onPageChange(page) : null}
          disabled={page === '...'}
          style={{
            ...styles.button,
            ...(currentPage === page ? styles.activeButton : {}),
            ...(page === '...' ? styles.ellipsis : {})
          }}
        >
          {page}
        </button>
      ))}
      
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        style={{...styles.button, ...styles.prevNext}}
      >
        Next →
      </button>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    flexWrap: 'wrap'
  },
  button: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    borderRadius: 4,
    cursor: 'pointer',
    minWidth: 40,
    fontSize: 14,
    transition: 'all 0.2s',
    ':hover:not(:disabled)': {
      backgroundColor: '#f0f0f0'
    },
    ':disabled': {
      opacity: 0.5,
      cursor: 'not-allowed'
    }
  },
  activeButton: {
    backgroundColor: '#1976d2',
    color: '#fff',
    borderColor: '#1976d2'
  },
  prevNext: {
    minWidth: 80
  },
  ellipsis: {
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'default',
    ':hover': {
      backgroundColor: 'transparent'
    }
  }
};