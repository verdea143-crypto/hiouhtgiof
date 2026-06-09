import React from 'react';

export function LoadingSpinner({ size = 'md', text = '' }) {
  const sizes = { sm: 'h-4 w-4', md: 'h-8 w-8', lg: 'h-12 w-12' };
  
  // Custom styling in CSS if Tailwind classes are not fully compiled or fallback is needed
  const loaderStyle = {
    sm: { width: '16px', height: '16px', borderWidth: '2px' },
    md: { width: '32px', height: '32px', borderWidth: '3px' },
    lg: { width: '48px', height: '48px', borderWidth: '4px' }
  }[size];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <div 
        className={`${sizes[size]} animate-spin`} 
        style={{
          ...loaderStyle,
          borderStyle: 'solid',
          borderColor: 'rgba(16, 185, 129, 0.15)',
          borderTopColor: '#10b981',
          borderRadius: '50%'
        }} 
      />
      {text && <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0, fontWeight: 500 }}>{text}</p>}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}} />
    </div>
  );
}
