import React from 'react';

interface LogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'print';
  showText?: boolean;
  variant?: 'light' | 'dark';
  className?: string;
}

const sizes = {
  xs: { width: 120, height: 40 }, sm: { width: 156, height: 52 }, md: { width: 204, height: 68 },
  lg: { width: 264, height: 88 }, xl: { width: 324, height: 108 }, '2xl': { width: 396, height: 132 }, print: { width: 204, height: 68 },
} as const;

export const Logo: React.FC<LogoProps> = ({ size = 'md', showText = true, variant = 'dark', className = '' }) => {
  const current = sizes[size];
  return (
    <div className={`inline-flex items-center select-none shrink-0 min-w-0 ${className}`}>
      {showText ? (
        <img src="/branding/siatek-logo-horizontal.png" alt="Siatek by Alpha Teknik" width={current.width} height={current.height} className={`object-contain object-left ${variant === 'light' ? 'brightness-0 invert' : ''}`} />
      ) : (
        <img src="/branding/siatek-icon.png" alt="Siatek" width={current.height} height={current.height} className="object-contain" />
      )}
    </div>
  );
};

export default Logo;
