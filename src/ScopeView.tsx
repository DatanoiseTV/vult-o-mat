import React, { useEffect, useRef, useState } from 'react';
import { Knob } from './Knob';
import { Settings2 } from 'lucide-react';

interface ScopeViewProps {
  getScopeData: () => Float32Array;
  getSpectrumData: () => Uint8Array;
  getProbedData?: (name: string) => number[] | null;
  probes?: string[];
}

type TriggerMode = 'NONE' | 'AUTO';

const ScopeView: React.FC<ScopeViewProps> = ({ getScopeData, getSpectrumData, getProbedData, probes = [] }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [triggerMode, setTriggerMode] = useState<TriggerMode>('AUTO');
  const [threshold, setThreshold] = useState<number>(0.0);
  const [gain, setGain] = useState<number>(1.0);
  const [zoom, setZoom] = useState<number>(1.0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  
  const dimensionsRef = useRef({ width: 800, height: 200, dpr: 1 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const dpr = window.devicePixelRatio || 1;
        const width = Math.floor(entry.contentRect.width);
        const height = Math.floor(entry.contentRect.height);
        
        if (width > 0 && height > 0) {
          dimensionsRef.current = { width, height, dpr };
          canvas.width = width * dpr;
          canvas.height = height * dpr;
        }
      }
    });
    
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrame: number;

    const render = () => {
      const { width, height, dpr } = dimensionsRef.current;
      const scopeData = getScopeData();
      const spectrumData = getSpectrumData();
      
      ctx.save();
      ctx.scale(dpr, dpr);
      const halfHeight = height / 2;

      ctx.fillStyle = '#050a05';
      ctx.fillRect(0, 0, width, height);

      // Grid
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < width; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, height); ctx.stroke(); }
      for (let i = 0; i < height; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(width, i); ctx.stroke(); }

      // Improved Spectrum (Log scale)
      const barCount = 128;
      const barWidth = width / barCount;
      const gradient = ctx.createLinearGradient(0, height, 0, 0);
      gradient.addColorStop(0, 'rgba(0, 50, 255, 0.0)');
      gradient.addColorStop(0.5, 'rgba(0, 150, 255, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 255, 255, 0.4)');
      
      ctx.fillStyle = gradient;
      for (let i = 0; i < barCount; i++) {
        const sampleIdx = Math.floor(Math.pow(spectrumData.length, i / barCount));
        const val = spectrumData[sampleIdx];
        const barHeight = (val / 255) * height * 0.8;
        ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
      }

      // Find Trigger Point
      let startIdx = 0;
      if (triggerMode === 'AUTO') {
        const searchRange = scopeData.length / 2;
        for (let i = 1; i < searchRange; i++) {
          if (scopeData[i-1] <= threshold && scopeData[i] > threshold) {
            startIdx = i;
            break;
          }
        }
      }

      const samplesToShow = Math.floor((scopeData.length / 2) / zoom);
      const displayData = scopeData.subarray(startIdx, startIdx + samplesToShow);

      // Main Output Trace
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ff00';
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      let sliceWidth = width / displayData.length;
      let x = 0;
      for (let i = 0; i < displayData.length; i++) {
        const y = (displayData[i] * gain * halfHeight * 0.9) + halfHeight;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.stroke();

      // Probed Trace
      if (probes.length > 0 && getProbedData) {
        const probedData = getProbedData(probes[0]);
        if (probedData && probedData.length > 0) {
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#ffcc00';
          ctx.strokeStyle = '#ffcc00';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([5, 5]);
          ctx.beginPath();
          x = 0;
          sliceWidth = width / probedData.length;
          for (let i = 0; i < probedData.length; i++) {
            const y = (probedData[i] * gain * halfHeight * 0.9) + halfHeight;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            x += sliceWidth;
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      ctx.restore();
      animationFrame = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrame);
  }, [getScopeData, getSpectrumData, getProbedData, probes, triggerMode, threshold, gain, zoom]);

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%', border: '1px solid #333', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
      <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      
      <button 
        onClick={() => setShowSettings(!showSettings)} 
        style={{ 
          position: 'absolute', top: '8px', right: '8px', zIndex: 20, 
          background: showSettings ? 'rgba(0, 122, 204, 0.4)' : 'rgba(255,255,255,0.1)', 
          border: '1px solid rgba(255,255,255,0.2)', color: showSettings ? '#00ffcc' : '#aaa', 
          borderRadius: '6px', padding: '4px', cursor: 'pointer', backdropFilter: 'blur(4px)',
          transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}
        title="Toggle Scope Settings"
      >
        <Settings2 size={16} />
      </button>

      {showSettings && (
        <div style={{ 
          position: 'absolute', top: '40px', right: '8px', display: 'flex', alignItems: 'center',
          gap: '12px', background: 'rgba(20,20,20,0.85)', backdropFilter: 'blur(12px)', padding: '8px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span style={{ fontSize: '8px', color: '#888', fontWeight: 'bold', letterSpacing: '0.5px' }}>SYNC</span>
            <select value={triggerMode} onChange={(e) => setTriggerMode(e.target.value as TriggerMode)} style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', color: '#00ffcc', fontSize: '9px', fontWeight: 'bold', borderRadius: '4px', outline: 'none', cursor: 'pointer', padding: '2px 4px' }}>
              <option value="NONE">NONE</option>
              <option value="AUTO">AUTO</option>
            </select>
          </div>
          <div style={{ width: '1px', height: '24px', background: 'rgba(255,255,255,0.1)' }} />
          <Knob label="GAIN" value={gain} min={0.1} max={5} onChange={setGain} size={28} color="#ffcc00" isFloat />
          <Knob label="ZOOM" value={zoom} min={1} max={10} onChange={setZoom} size={28} color="#00ffcc" isFloat />
          {triggerMode === 'AUTO' && (
            <Knob label="THR" value={threshold} min={-1} max={1} onChange={setThreshold} size={28} color="#ff4444" isFloat />
          )}
        </div>
      )}
    </div>
  );
};

export default ScopeView;
