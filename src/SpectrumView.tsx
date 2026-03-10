import React, { useEffect, useRef, useState } from 'react';
import { Activity } from 'lucide-react';

interface SpectrumViewProps {
  getSpectrumData: () => Uint8Array;
  getPeakFrequencies: (count?: number) => { energy: number; frequency: number }[];
}

const SpectrumView: React.FC<SpectrumViewProps> = ({ getSpectrumData, getPeakFrequencies }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [peaks, setPeaks] = useState<{ energy: number; frequency: number }[]>([]);
  const dimensionsRef = useRef({ width: 800, height: 150, dpr: 1 });

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
    let lastPeakUpdate = 0;

    const render = (time: number) => {
      const { width, height, dpr } = dimensionsRef.current;
      const spectrumData = getSpectrumData();

      ctx.save();
      ctx.scale(dpr, dpr);

      // Clear
      ctx.fillStyle = '#050a05';
      ctx.fillRect(0, 0, width, height);

      // Grid Y (Amplitude)
      ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
      ctx.font = '9px monospace';

      for (let i = 1; i <= 4; i++) {
        const y = (height / 4) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw Spectrum (Logarithmic scale)
      const binCount = spectrumData.length;
      if (binCount > 0) {
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, 'rgba(0, 200, 255, 0.0)');
        gradient.addColorStop(0.5, 'rgba(0, 200, 255, 0.4)');
        gradient.addColorStop(1, 'rgba(0, 200, 255, 0.8)');

        ctx.fillStyle = gradient;

        const minLogFreq = Math.log10(20);
        const maxLogFreq = Math.log10(20000);
        const logRange = maxLogFreq - minLogFreq;

        ctx.beginPath();
        ctx.moveTo(0, height);

        const nyquist = 22050; // Approx default sampleRate / 2

        let prevX = 0;
        for (let i = 0; i < binCount; i++) {
          const freq = (i / binCount) * nyquist;
          if (freq < 20) continue;

          const normX = (Math.log10(freq) - minLogFreq) / logRange;
          const x = normX * width;
          const val = spectrumData[i];
          const barHeight = (val / 255) * height;
          const y = height - barHeight;

          ctx.lineTo(x, y);
          prevX = x;
        }

        ctx.lineTo(prevX, height);
        ctx.lineTo(width, height);
        ctx.fill();

        // Highlight dominant peaks
        if (time - lastPeakUpdate > 500) {
          lastPeakUpdate = time;
          setPeaks(getPeakFrequencies(3));
        }

        ctx.strokeStyle = 'rgba(255, 204, 0, 0.8)';
        ctx.beginPath();
        peaks.forEach(p => {
          if (p.frequency >= 20 && p.frequency <= 20000) {
            const normX = (Math.log10(p.frequency) - minLogFreq) / logRange;
            const x = normX * width;
            ctx.moveTo(x, height);
            ctx.lineTo(x, height - (p.energy / 255) * height);
          }
        });
        ctx.stroke();
      }

      // Draw Grid X (Frequency labels)
      const labelFreqs = [100, 500, 1000, 5000, 10000];
      ctx.fillStyle = 'rgba(0, 255, 255, 0.5)';
      ctx.textAlign = 'center';

      const minLogFreq = Math.log10(20);
      const logRange = Math.log10(20000) - minLogFreq;

      labelFreqs.forEach(freq => {
        const normX = (Math.log10(freq) - minLogFreq) / logRange;
        const x = normX * width;

        ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        ctx.fillText(`${freq >= 1000 ? freq / 1000 + 'k' : freq}Hz`, x, height - 5);
      });

      ctx.restore();

      animationFrame = requestAnimationFrame(render);
    };

    animationFrame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrame);
  }, [getSpectrumData, getPeakFrequencies, peaks]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', border: '1px solid #333', background: '#000', borderRadius: '8px', overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid #222', background: '#080808', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Activity size={14} color="#00c8ff" />
          <span style={{ fontSize: '11px', color: '#00c8ff', fontWeight: 'bold', letterSpacing: '0.5px' }}>SPECTRUM</span>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          {peaks.map((p, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '9px', color: '#666' }}>P{i + 1}:</span>
              <span style={{ fontSize: '11px', color: '#ffcc00', fontWeight: 'bold' }}>{p.frequency} <span style={{ fontSize: '9px', color: '#888' }}>Hz</span></span>
            </div>
          ))}
          {peaks.length === 0 && <span style={{ fontSize: '10px', color: '#444' }}>WAITING...</span>}
        </div>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: '80px' }}>
        <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
      </div>
    </div>
  );
};

export default SpectrumView;
