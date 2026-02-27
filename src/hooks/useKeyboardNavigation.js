import { useEffect } from 'react';

export const useKeyboardNavigation = (handlers) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't trigger if in input/textarea
      if (e.target.matches('input, textarea, select')) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          handlers.onEscape?.();
          break;
        case 'Enter':
          handlers.onEnter?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          handlers.onArrowUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          handlers.onArrowDown?.();
          break;
        case 'ArrowLeft':
          handlers.onArrowLeft?.();
          break;
        case 'ArrowRight':
          handlers.onArrowRight?.();
          break;
        case 'Tab':
          if (e.shiftKey) {
            handlers.onShiftTab?.();
          } else {
            handlers.onTab?.();
          }
          break;
        case ' ':
          e.preventDefault();
          handlers.onSpace?.();
          break;
        default:
          // Number keys for shortcuts
          if (e.key >= '1' && e.key <= '9') {
            handlers.onNumberKey?.(parseInt(e.key));
          }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
};

// Usage:
// useKeyboardNavigation({
//   onEscape: () => closeModal(),
//   onEnter: () => submitForm(),
//   onArrowUp: () => moveUp(),
//   onArrowDown: () => moveDown(),
//   onNumberKey: (num) => navigateToSection(num)
// });