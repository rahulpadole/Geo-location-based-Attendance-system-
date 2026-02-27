import React, { forwardRef } from 'react';

const AccessibleButton = forwardRef(({
  children,
  onClick,
  disabled,
  ariaLabel,
  ariaExpanded,
  ariaControls,
  ariaPressed,
  role = 'button',
  type = 'button',
  className,
  style,
  ...props
}, ref) => {
  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-controls={ariaControls}
      aria-pressed={ariaPressed}
      role={role}
      className={className}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        ...style
      }}
      {...props}
    >
      {children}
      {!ariaLabel && <span className="sr-only">{ariaLabel}</span>}
    </button>
  );
});

AccessibleButton.displayName = 'AccessibleButton';

export const AccessibleIcon = ({ icon, label, onClick, ...props }) => (
  <AccessibleButton
    onClick={onClick}
    ariaLabel={label}
    style={{
      background: 'none',
      border: 'none',
      padding: 8,
      fontSize: 20
    }}
    {...props}
  >
    {icon}
  </AccessibleButton>
);

export default AccessibleButton;