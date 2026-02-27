import { useState, useEffect } from 'react';

export function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Usage example:
// const [searchTerm, setSearchTerm] = useState('');
// const debouncedSearch = useDebounce(searchTerm, 300);
// 
// useEffect(() => {
//   if (debouncedSearch) {
//     // API call with debouncedSearch
//   }
// }, [debouncedSearch]);