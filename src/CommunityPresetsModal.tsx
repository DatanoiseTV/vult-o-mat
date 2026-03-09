import React, { useState, useEffect } from 'react';
import { X, Search, PackageOpen } from 'lucide-react';
import { loadPresetCode } from './useCommunityPresets';

interface CommunityPresetsModalProps {
  onClose: () => void;
  onLoad: (code: string, name: string) => void;
  onInsert: (code: string) => void;
  communityGroups: any[];
  communityLoading: boolean;
}

const CommunityPresetsModal: React.FC<CommunityPresetsModalProps> = ({ onClose, onLoad, onInsert, communityGroups, communityLoading }) => {
  const [filter, setFilter] = useState('');
  const [loadingPreset, setLoadingPreset] = useState<string | null>(null);

  const filteredPresets = communityGroups.flatMap(group => 
    group.presets.filter((p: any) => 
      p.name.toLowerCase().includes(filter.toLowerCase()) || 
      p.author.toLowerCase().includes(filter.toLowerCase()) ||
      p.meta?.description?.toLowerCase().includes(filter.toLowerCase())
    ).map((p: any) => ({ ...p, author: group.author }))
  ).sort((a, b) => a.name.localeCompare(b.name));

  const handleLoad = async (path: string, name: string) => {
    setLoadingPreset(path);
    try {
      const code = await loadPresetCode(path);
      onLoad(code, name);
      onClose(); // Close modal after loading
    } catch (e) {
      console.error('Failed to load preset:', e);
      alert('Failed to load preset. Check console for details.');
    } finally {
      setLoadingPreset(null);
    }
  };

  const handleInsert = async (path: string) => {
    setLoadingPreset(path);
    try {
      const code = await loadPresetCode(path);
      onInsert(code);
      // Keep modal open for multiple inserts if desired, or close: onClose();
    } catch (e) {
      console.error('Failed to insert preset:', e);
      alert('Failed to insert preset. Check console for details.');
    } finally {
      setLoadingPreset(null);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000,
    }} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        background: 'rgba(30,30,30,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
        width: '90vw', maxWidth: '1000px', height: '90vh', maxHeight: '800px',
        display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 15px 50px rgba(0,0,0,0.5)'
      }}>
        {/* Header */}
        <div style={{ padding: '15px 20px', borderBottom: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PackageOpen size={24} color="#00ffcc" />
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#00ffcc', letterSpacing: '1px', textShadow: '0 0 8px rgba(0,255,204,0.3)' }}>COMMUNITY LIBRARY</span>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#888', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {/* Search Bar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Search size={16} color="#888" />
          <input
            type="text"
            placeholder="Filter presets by name, author, or description..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '13px', outline: 'none',
              transition: 'border-color 0.2s', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
            }}
            onFocus={(e) => e.target.style.borderColor = '#00ffcc'}
            onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
        </div>

        {/* Presets Grid */}
        <div className="no-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {communityLoading ? (
            <div style={{ color: '#888', textAlign: 'center', padding: '50px', fontSize: '14px' }}>Loading community presets...</div>
          ) : filteredPresets.length === 0 ? (
            <div style={{ color: '#888', textAlign: 'center', padding: '50px', fontSize: '14px' }}>No presets found.</div>
          ) : (
            filteredPresets.map(preset => (
              <div key={preset.path} style={{
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px',
                padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px', boxShadow: '0 4px 15px rgba(0,0,0,0.3)',
                transition: 'all 0.2s ease-in-out'
              }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#00ffcc', letterSpacing: '0.5px' }}>{preset.name}</div>
                <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', fontWeight: 'bold' }}>by {preset.author}</div>
                {preset.meta?.description && <div style={{ fontSize: '12px', color: '#aaa' }}>{preset.meta.description}</div>}
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <button 
                    onClick={() => handleLoad(preset.path, preset.name)} 
                    disabled={loadingPreset === preset.path}
                    style={{
                      flex: 1, background: 'rgba(0,122,204,0.3)', border: '1px solid rgba(0,122,204,0.5)',
                      borderRadius: '6px', padding: '8px 12px', color: '#fff', fontSize: '12px', fontWeight: 'bold',
                      cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    {loadingPreset === preset.path ? <Activity size={14} className="animate-spin" /> : 'LOAD'}
                  </button>
                  <button 
                    onClick={() => handleInsert(preset.path)} 
                    disabled={loadingPreset === preset.path}
                    style={{
                      flex: 1, background: 'rgba(255,204,0,0.15)', border: '1px solid rgba(255,204,0,0.3)',
                      borderRadius: '6px', padding: '8px 12px', color: '#ffcc00', fontSize: '12px', fontWeight: 'bold',
                      cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px'
                    }}
                  >
                    {loadingPreset === preset.path ? <Activity size={14} className="animate-spin" /> : 'INSERT'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityPresetsModal;