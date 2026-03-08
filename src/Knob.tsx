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
  const [isDragging, setIsMouseDown] = useState(false);
  const startY = useRef(0);
  const startValue = useRef(0);

  const onMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsMouseDown(true);
    startY.current = 'touches' in e ? e.touches[0].clientY : e.clientY;
    startValue.current = value;
    document.body.style.cursor = 'ns-resize';
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaY = startY.current - clientY;
      const range = max - min;
      const step = range / 200; // sensitivity
      let newValue = startValue.current + deltaY * step;
      newValue = Math.max(min, Math.min(max, newValue));
      onChange(isFloat ? newValue : Math.round(newValue));
    };

    const onMouseUp = () => {
      setIsMouseDown(false);
      document.body.style.cursor = 'default';
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
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

  // SVG angle calculation
  const angle = ((value - min) / (max - min)) * 270 - 135;

  return (
    <div className="knob-unit" style={{ width: size, userSelect: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div className="knob-label" style={{ fontSize: '7px', color: '#666', marginBottom: '2px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{label}</div>
      <div 
        onMouseDown={onMouseDown} 
        onTouchStart={onMouseDown}
        style={{ 
          width: size, height: size, 
          position: 'relative', 
          cursor: 'ns-resize' 
        }}
      >
        <svg width={size} height={size} viewBox="0 0 40 40">
          {/* Knob Outer ring */}
          <circle cx="20" cy="20" r="18" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
          {/* Knob Inner track */}
          <path 
            d="M 10 32 A 16 16 0 1 1 30 32" 
            fill="none" stroke="#111" strokeWidth="2" strokeLinecap="round" 
          />
          {/* Value Track */}
          <path 
            d="M 10 32 A 16 16 0 1 1 30 32" 
            fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" 
            strokeDasharray={`${((value - min) / (max - min)) * 75} 100`}
            style={{ transition: 'stroke-dasharray 0.1s' }}
          />
          {/* Knob Cap */}
          <g transform={`rotate(${angle} 20 20)`}>
            <circle cx="20" cy="20" r="14" fill="#2d2d2d" style={{ filter: 'drop-shadow(0 2px 2px rgba(0,0,0,0.5))' }} />
            <rect x="19" y="8" width="2" height="8" rx="1" fill={color} />
          </g>
        </svg>
      </div>
      <div className="knob-value" style={{ fontSize: '8px', color: color, marginTop: '2px', textAlign: 'center' }}>
        {isFloat ? value.toFixed(2) : value}
      </div>
    </div>
  );
};
