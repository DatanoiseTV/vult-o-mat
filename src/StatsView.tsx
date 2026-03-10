import React, { useEffect, useRef, useState } from 'react';

interface StatsViewProps {
  getDSPStats: () => Record<string, any>;
}

const StatsView: React.FC<StatsViewProps> = ({ getDSPStats }) => {
  const [stats, setStats] = useState<any>({ L: {}, R: {} });
  const intervalRef = useRef<number>(0);

  useEffect(() => {
    const update = () => setStats(getDSPStats());
    update();
    intervalRef.current = window.setInterval(update, 1000);
    return () => window.clearInterval(intervalRef.current);
  }, [getDSPStats]);

  const metrics = [
    { k: 'RMS', l: 'RMS' },
    { k: 'Peak', l: 'PK' },
    { k: 'Crest', l: 'CR' },
    { k: 'DC', l: 'DC' },
    { k: 'SNR', l: 'SNR' },
    { k: 'THD+N', l: 'THD' },
    { k: 'F0', l: 'F0' }
  ];

  const renderPanel = (label: string, channelStats: any, color: string) => (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ 
        fontSize: '8px', color, fontWeight: 'bold', 
        borderBottom: `1px solid ${color}44`, 
        marginBottom: '4px', paddingBottom: '1px' 
      }}>
        {label}
      </div>
      {metrics.map(m => (
        <div key={m.k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '4px' }}>
          <span style={{ fontSize: '7px', color: '#555', textTransform: 'uppercase', minWidth: '24px' }}>{m.l}</span>
          <span style={{ fontSize: '9px', color: '#ccc', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {channelStats?.[m.k] || '—'}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{
      width: '100%', border: '1px solid #222', background: '#080808', 
      borderRadius: '4px', padding: '6px 10px', overflow: 'hidden',
    }}>
      <div style={{ display: 'flex', gap: '16px' }}>
        {renderPanel('LEFT ◀', stats.L, '#ffcc00')}
        <div style={{ width: '1px', background: '#222', alignSelf: 'stretch' }} />
        {renderPanel('RIGHT ▶', stats.R, '#00ccff')}
      </div>
      <div style={{ 
        borderTop: '1px solid #111', marginTop: '6px', paddingTop: '2px',
        textAlign: 'right', fontSize: '6px', color: '#333' 
      }}>
        Fs {stats.Fs}
      </div>
    </div>
  );
};

export default StatsView;
