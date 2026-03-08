import React, { useState, useEffect, useRef } from 'react';

export interface KnobProps {
  value: number;
  min: number;
  max: number;
  label: string;
  onChange: (val: number) => void;
  size?: number;
  color?: string;
  isFloat?: boolean;
}

export const Knob: React.FC<KnobProps> = ({ value, min, max, label, onChange, size = 32, color = '#ffcc00', isFloat = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);
  const isFineMode = useRef(false);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
    startValue.current = value;
    isFineMode.current = e.shiftKey;
    document.body.style.cursor = 'ns-resize';
  };

  const onTouchStart = (e: React.TouchEvent) => {
    // Prevent scrolling while adjusting knob
    if (e.cancelable) e.preventDefault();
    setIsDragging(true);
    startY.current = e.touches[0].clientY;
    startValue.current = value;
    document.body.style.cursor = 'ns-resize';
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = startY.current - clientY;
      const range = max - min;
      
      // Sensitivity adjustment: 
      // Standard: 400 pixels for full range
      // Fine (Shift): 2000 pixels for full range
      const fine = ('shiftKey' in e && e.shiftKey) || isFineMode.current;
      const pixelRange = fine ? 2000 : 400;
      
      const step = range / pixelRange;
      let newValue = startValue.current + deltaY * step;
      
      newValue = Math.max(min, Math.min(max, newValue));
      
      if (isFloat) {
        onChange(newValue);
      } else {
        onChange(Math.round(newValue));
      }
    };

    const onMouseUp = () => {
      setIsDragging(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove, { passive: false });
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onMouseMove, { passive: false });
      window.addEventListener('touchend', onMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onMouseMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging, max, min, onChange, isFloat]);

  // SVG angle calculation: -135 to 135 degrees (270 degree sweep)
  const angle = ((value - min) / (max - min)) * 270 - 135;

  return (
    <div className="knob-unit" style={{ width: size, userSelect: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="knob-label" style={{ 
        fontSize: '7px', 
        color: '#888', 
        marginBottom: '2px', 
        textAlign: 'center', 
        whiteSpace: 'nowrap', 
        overflow: 'hidden', 
        textOverflow: 'ellipsis', 
        maxWidth: '100%',
        fontWeight: 'bold'
      }}>
        {label}
      </div>
      
      <div 
        onMouseDown={onMouseDown} 
        onTouchStart={onTouchStart}
        style={{ 
          width: size, 
          height: size, 
          position: 'relative', 
          cursor: 'ns-resize',
          touchAction: 'none' // Critical for mobile
        }}
      >
        <svg width={size} height={size} viewBox="0 0 40 40">
          {/* Knob Shadow */}
          <circle cx="20" cy="22" r="16" fill="rgba(0,0,0,0.3)" />
          
          {/* Knob Body */}
          <circle cx="20" cy="20" r="18" fill="#1a1a1a" stroke="#444" strokeWidth="1" />
          
          {/* Track background */}
          <path 
            d="M 10 32 A 16 16 0 1 1 30 32" 
            fill="none" 
            stroke="#000" 
            strokeWidth="3" 
            strokeLinecap="round" 
          />
          
          {/* Value Track (Glow) */}
          <path 
            d="M 10 32 A 16 16 0 1 1 30 32" 
            fill="none" 
            stroke={color} 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeDasharray={`${((value - min) / (max - min)) * 75} 100`}
            style={{ 
              transition: isDragging ? 'none' : 'stroke-dasharray 0.15s ease-out',
              filter: `drop-shadow(0 0 2px ${color})` 
            }}
          />
          
          {/* Knob Cap / Face */}
          <g transform={`rotate(${angle} 20 20)`}>
            <circle cx="20" cy="20" r="13" fill="linear-gradient(to bottom, #333, #222)" />
            <circle cx="20" cy="20" r="13" fill="#2a2a2a" stroke="#111" strokeWidth="0.5" />
            
            {/* Indicator Needle */}
            <rect x="19" y="6" width="2" height="10" rx="1" fill={color} />
            <rect x="19.5" y="6" width="1" height="10" rx="0.5" fill="rgba(255,255,255,0.3)" />
          </g>
        </svg>
      </div>
      
      <div className="knob-value" style={{ 
        fontSize: '8px', 
        color: color, 
        marginTop: '2px', 
        textAlign: 'center',
        fontFamily: 'monospace',
        background: 'rgba(0,0,0,0.3)',
        padding: '0 2px',
        borderRadius: '2px',
        minWidth: '24px'
      }}>
        {isFloat ? value.toFixed(2) : Math.round(value)}
      </div>
    </div>
  );
};
