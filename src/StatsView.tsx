import React, { useEffect, useRef, useState } from 'react';

interface StatsViewProps {
  getDSPStats: () => Record<string, any>;
}

const StatsView: React.FC<StatsViewProps> = ({ getDSPStats }) => {
  const [stats, setStats] = useState<any>({});
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    const update = () => setStats(getDSPStats());
    update();
    intervalRef.current = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalRef.current);
  }, [getDSPStats]);

  const renderChannel = (label: string, channelStats: any, color: string) => {
    if (!channelStats) return null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <div style={{ 
          fontSize: '9px', fontWeight: 'bold', color, 
          borderBottom: `1px solid ${color}33`, 
          paddingBottom: '2px', marginBottom: '4px',
          letterSpacing: '0.5px'
        }}>
          {label}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '4px 8px' }}>
          {Object.entries(channelStats).map(([key, val]) => (
            <div key={key} style={{ display: 'flex', alignItems: 'baseline', gap: '3px', whiteSpace: 'nowrap' }}>
              <span style={{ fontSize: '7px', color: '#555', fontWeight: 'bold', textTransform: 'uppercase', minWidth: '32px' }}>{key}</span>
              <span style={{ fontSize: '10px', color: '#ccc', fontWeight: 'bold', fontFamily: 'monospace' }}>{String(val)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: '8px', width: '100%',
      border: '1px solid #333', background: '#080808', borderRadius: '6px',
      padding: '8px 12px', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', width: '100%', gap: '16px' }}>
        <div style={{ flex: 1 }}>
          {renderChannel('LEFT CHANNEL ◀', stats.L, '#ffcc00')}
        </div>
        {stats.R && (
          <div style={{ flex: 1, borderLeft: '1px solid #222', paddingLeft: '16px' }}>
            {renderChannel('RIGHT CHANNEL ▶', stats.R, '#00ccff')}
          </div>
        )}
      </div>
      
      {stats.Fs && (
        <div style={{ 
          borderTop: '1px solid #222', paddingTop: '4px', 
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '4px' 
        }}>
          <span style={{ fontSize: '7px', color: '#444', fontWeight: 'bold' }}>SYSTEM</span>
          <span style={{ fontSize: '8px', color: '#888', fontWeight: 'bold', fontFamily: 'monospace' }}>{stats.Fs}</span>
        </div>
      )}
    </div>
  );
};

export default StatsView;
