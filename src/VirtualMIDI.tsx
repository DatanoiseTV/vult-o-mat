import React, { useState, useEffect, useRef } from 'react';
import { Keyboard, MousePointer2, ChevronLeft, ChevronRight, Volume2, Volume1 } from 'lucide-react';
import { Knob } from './Knob';

interface VirtualMIDIProps {
  onCC: (cc: number, value: number) => void;
  onNoteOn: (note: number, velocity: number) => void;
  onNoteOff: (note: number) => void;
  ccLabels: Record<number, string>;
  initialState?: Record<string, any>;
}

const abletonMapping: Record<string, number> = {
  'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4, 'f': 5, 't': 6, 'g': 7,
  'y': 8, 'h': 9, 'u': 10, 'j': 11, 'k': 12, 'o': 13, 'l': 14,
  'p': 15, ';': 16, "'": 17
};

// Map offset to key string for display
const offsetToKey = Object.entries(abletonMapping).reduce((acc, [key, offset]) => {
  acc[offset] = key.toUpperCase();
  return acc;
}, {} as Record<number, string>);

const VirtualMIDI: React.FC<VirtualMIDIProps> = ({ onCC, onNoteOn, onNoteOff, ccLabels, initialState }) => {
  const [kbEnabled, setKbEnabled] = useState(false);
  const [octave, setOctave] = useState(3);
  const [velocity, setVelocity] = useState(100);
  const [ccValues, setCcValues] = useState<Record<number, number>>({});
  const [activeNotes, setActiveNotes] = useState<number[]>([]);
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  const octaveRef = useRef(octave);
  const velocityRef = useRef(velocity);

  useEffect(() => {
    octaveRef.current = octave;
    velocityRef.current = velocity;
  }, [octave, velocity]);

  useEffect(() => {
    setCcValues(prev => {
      const next = { ...prev };
      Object.keys(ccLabels).forEach(cc => {
        const num = parseInt(cc);
        const varName = ccLabels[num].toLowerCase();
        const actualVar = Object.keys(initialState || {}).find(k => k.toLowerCase().endsWith('.' + varName) || k.toLowerCase() === varName);
        if (actualVar && initialState![actualVar] !== undefined && typeof initialState![actualVar] === 'number') {
          next[num] = Math.round(initialState![actualVar] * 127);
        } else if (next[num] === undefined) {
          next[num] = 64;
        }
      });
      return next;
    });
  }, [ccLabels, initialState]);

  const handleCCChange = (cc: number, val: number) => {
    setCcValues(prev => ({ ...prev, [cc]: val }));
    onCC(cc, val);
  };

  const playNote = (midi: number) => {
    if (midi < 0 || midi > 127) return;
    onNoteOn(midi, velocityRef.current);
    setActiveNotes(prev => Array.from(new Set([...prev, midi])));
  };

  const stopNote = (midi: number) => {
    if (midi < 0 || midi > 127) return;
    onNoteOff(midi);
    setActiveNotes(prev => prev.filter(n => n !== midi));
  };

  useEffect(() => {
    if (!kbEnabled) return;

    const activeKeyNotes: Record<string, number> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      
      const key = e.key.toLowerCase();
      
      if (key === 'z') {
        setOctave(o => Math.max(0, o - 1));
      } else if (key === 'x') {
        setOctave(o => Math.min(8, o + 1));
      } else if (key === 'c') {
        setVelocity(v => Math.max(1, v - 20));
      } else if (key === 'v') {
        setVelocity(v => Math.min(127, v + 20));
      } else {
        const offset = abletonMapping[key];
        if (offset !== undefined && !activeKeyNotes[key]) {
          const startMidi = (octaveRef.current + 1) * 12;
          const note = startMidi + offset;
          activeKeyNotes[key] = note;
          playNote(note);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const note = activeKeyNotes[key];
      if (note !== undefined) {
        stopNote(note);
        delete activeKeyNotes[key];
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      Object.values(activeKeyNotes).forEach(note => stopNote(note));
    };
  }, [kbEnabled]);

  const startMidi = (octave + 1) * 12;
  const numOctaves = 2;
  const firstNote = startMidi;
  const lastNote = firstNote + (12 * numOctaves);

  // Build the keyboard array
  const whiteKeys = [];
  for (let i = firstNote; i <= lastNote; i++) {
    const isBlack = [1, 3, 6, 8, 10].includes(i % 12);
    if (!isBlack) {
      const hasBlackNext = i + 1 <= lastNote && [1, 3, 6, 8, 10].includes((i + 1) % 12);
      whiteKeys.push({ midi: i, blackMidi: hasBlackNext ? i + 1 : null });
    }
  }

  return (
    <div className="virtual-midi-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="midi-controls-row">
        <div className="midi-group">
          <span className="mini-label">OCTAVE</span>
          <div className="stepper">
            <ChevronLeft size={10} style={{ cursor: 'pointer' }} onClick={() => setOctave(o => Math.max(0, o - 1))} />
            <span className="stepper-value">{octave - 2}</span>
            <ChevronRight size={10} style={{ cursor: 'pointer' }} onClick={() => setOctave(o => Math.min(8, o + 1))} />
          </div>
        </div>
        <div className="midi-group">
          <span className="mini-label">VELOCITY</span>
          <div className="stepper">
            <Volume1 size={10} style={{ cursor: 'pointer' }} onClick={() => setVelocity(v => Math.max(1, v - 20))} />
            <span className="stepper-value">{velocity}</span>
            <Volume2 size={10} style={{ cursor: 'pointer' }} onClick={() => setVelocity(v => Math.min(127, v + 20))} />
          </div>
        </div>
        <div className="spacer" style={{ flex: 1 }} />
        <button 
          className={`kb-toggle ${kbEnabled ? 'active' : ''}`} 
          onClick={() => setKbEnabled(!kbEnabled)}
          style={{ 
            padding: '6px 14px', 
            borderRadius: '4px', 
            background: kbEnabled ? 'var(--accent-primary)' : '#2a2a2a',
            color: kbEnabled ? '#fff' : '#aaa',
            border: kbEnabled ? '1px solid var(--accent-primary)' : '1px solid #444',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: kbEnabled ? 'bold' : 'normal',
            cursor: 'pointer',
            boxShadow: kbEnabled ? '0 0 12px rgba(var(--accent-primary-rgb), 0.4)' : 'none',
            transition: 'all 0.2s'
          }}
        >
          {kbEnabled ? <Keyboard size={14} /> : <MousePointer2 size={14} />}
          {kbEnabled ? 'PC KEYBOARD ON' : 'ENABLE PC KEYBOARD'}
        </button>
      </div>

      {kbEnabled && (
        <div style={{ textAlign: 'center', padding: '10px 15px 0', fontSize: '12px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'center', gap: '20px' }}>
          <span>🎹 <strong>Play Notes:</strong> A, W, S, E, D, F, T, G, Y...</span>
          <span>↕️ <strong>Octave:</strong> Z / X</span>
          <span>🔊 <strong>Velocity:</strong> C / V</span>
        </div>
      )}

      <div className="knobs-row" style={{ flexWrap: 'wrap', justifyContent: 'center', gap: '24px', padding: '15px' }}>
        {Object.keys(ccLabels).sort((a, b) => parseInt(a) - parseInt(b)).map(ccStr => {
          const cc = parseInt(ccStr);
          return (
            <div key={cc} style={{ flex: '0 0 auto' }}>
              <Knob 
                label={`[${cc}] ${ccLabels[cc]}`} 
                value={ccValues[cc] || 64} 
                min={0} 
                max={127} 
                size={44}
                onChange={(val) => handleCCChange(cc, val)} 
              />
            </div>
          );
        })}
      </div>

      <div 
        className="keyboard-container" 
        ref={containerRef} 
        style={{ 
          height: '140px', 
          background: 'var(--bg-base)', 
          borderTop: '2px solid var(--bg-surface-elevated)', 
          padding: '16px 20px', 
          overflowX: 'auto', 
          overflowY: 'hidden', 
          display: 'flex', 
          justifyContent: 'center',
          boxShadow: 'inset 0 10px 20px rgba(0,0,0,0.5)'
        }}
      >
        <div style={{ display: 'flex', height: '100%', minWidth: '400px', maxWidth: '800px', margin: '0 auto', flex: 1, position: 'relative' }}>
          {whiteKeys.map(wk => {
            const isWhiteActive = activeNotes.includes(wk.midi);
            const wOffset = wk.midi - startMidi;
            const wLabel = kbEnabled && offsetToKey[wOffset] ? offsetToKey[wOffset] : '';

            return (
              <div
                key={wk.midi}
                onPointerDown={(e) => { e.currentTarget.releasePointerCapture(e.pointerId); playNote(wk.midi); }}
                onPointerEnter={(e) => { if (e.buttons > 0) playNote(wk.midi); }}
                onPointerUp={() => stopNote(wk.midi)}
                onPointerLeave={() => stopNote(wk.midi)}
                style={{
                  flex: 1,
                  position: 'relative',
                  border: '1px solid #111',
                  background: isWhiteActive 
                    ? 'var(--accent-primary)' 
                    : 'linear-gradient(to bottom, #f0f0f0 0%, #d4d4d4 100%)',
                  borderRadius: '0 0 6px 6px',
                  boxShadow: isWhiteActive 
                    ? 'inset 0 2px 8px rgba(0,0,0,0.4), 0 0 10px rgba(var(--accent-primary-rgb), 0.5)' 
                    : 'inset 0 1px 0 rgba(255,255,255,0.8), 0 4px 6px rgba(0,0,0,0.3)',
                  marginRight: '2px',
                  cursor: 'pointer',
                  transition: 'background 0.05s ease, box-shadow 0.05s ease',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  paddingBottom: '12px',
                }}
              >
                {/* Visual contour for white key */}
                {!isWhiteActive && (
                  <div style={{ position: 'absolute', top: 0, left: '2px', right: '2px', bottom: '10px', background: 'linear-gradient(to bottom, transparent, rgba(0,0,0,0.03))', pointerEvents: 'none' }} />
                )}
                
                {wLabel && (
                  <span style={{ 
                    fontSize: '11px', 
                    fontWeight: 800, 
                    color: isWhiteActive ? '#fff' : '#666',
                    textShadow: isWhiteActive ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
                    userSelect: 'none'
                  }}>
                    {wLabel}
                  </span>
                )}

                {wk.blackMidi && (
                  <div
                    onPointerDown={(e) => { e.stopPropagation(); e.currentTarget.releasePointerCapture(e.pointerId); playNote(wk.blackMidi!); }}
                    onPointerEnter={(e) => { e.stopPropagation(); if (e.buttons > 0) playNote(wk.blackMidi!); }}
                    onPointerUp={(e) => { e.stopPropagation(); stopNote(wk.blackMidi!); }}
                    onPointerLeave={(e) => { e.stopPropagation(); stopNote(wk.blackMidi!); }}
                    style={{
                      position: 'absolute',
                      right: 'calc(-25% - 1px)',
                      top: 0,
                      width: '50%',
                      height: '65%',
                      background: activeNotes.includes(wk.blackMidi) 
                        ? 'var(--accent-secondary)' 
                        : 'linear-gradient(to bottom, #2a2a2a 0%, #111 100%)',
                      zIndex: 10,
                      borderRadius: '0 0 4px 4px',
                      border: '1px solid #000',
                      borderTop: 'none',
                      boxShadow: activeNotes.includes(wk.blackMidi) 
                        ? 'inset 0 2px 5px rgba(0,0,0,0.5), 0 0 10px rgba(var(--accent-secondary-rgb), 0.6)' 
                        : 'inset 0 1px 0 rgba(255,255,255,0.1), 0 6px 8px rgba(0,0,0,0.6)',
                      transition: 'background 0.05s ease, box-shadow 0.05s ease',
                      display: 'flex',
                      alignItems: 'flex-end',
                      justifyContent: 'center',
                      paddingBottom: '8px',
                    }}
                  >
                    {!activeNotes.includes(wk.blackMidi) && (
                      <div style={{ position: 'absolute', top: 0, left: '15%', right: '15%', height: '80%', background: 'linear-gradient(to bottom, rgba(255,255,255,0.05), transparent)', borderRadius: '2px', pointerEvents: 'none' }} />
                    )}

                    {kbEnabled && offsetToKey[wk.blackMidi - startMidi] && (
                      <span style={{ 
                        fontSize: '9px', 
                        fontWeight: 700, 
                        color: activeNotes.includes(wk.blackMidi) ? '#000' : '#888',
                        userSelect: 'none'
                      }}>
                        {offsetToKey[wk.blackMidi - startMidi]}
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VirtualMIDI;

