'use client';

import { useEffect, useRef } from 'react';
import { useTheme } from './ThemeProvider';

export default function LiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useTheme();

  // Mouse position for glow
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      document.documentElement.style.setProperty('--mouse-x', x + 'px');
      document.documentElement.style.setProperty('--mouse-y', y + 'px');
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, []);

  // Particle network – subtle dots
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const styles = getComputedStyle(document.documentElement);
    const dotColor = styles.getPropertyValue('--accent').trim() || '#2b6cb0';
    const isLight = theme === 'light';

    const hexToRgb = (hex: string) => {
      const clean = hex.replace('#', '');
      const num = parseInt(clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean, 16);
      return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
    };
    const { r, g, b } = hexToRgb(dotColor);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const count = width < 768 ? 34 : 60;
    const particles = Array.from({ length: count }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: Math.random() * 2.2 + 1,
      vx: (Math.random() - 0.5) * 0.15,
      vy: (Math.random() - 0.5) * 0.15,
      alpha: Math.random() * (isLight ? 0.3 : 0.5) + (isLight ? 0.1 : 0.15),
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${p.alpha})`;
        ctx.fill();
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist2 = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist2 < 130) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            const lineAlpha = (isLight ? 0.12 : 0.18) - dist2 / 900;
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${Math.max(lineAlpha, 0)})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }
      });
      animationFrameId = requestAnimationFrame(render);
    };
    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Blueprint grid (CSS background) – kept for subtle texture */}
      <div className="absolute inset-0 blueprint-grid opacity-30" />

      {/* Particles */}
      <canvas ref={canvasRef} className="w-full h-full pointer-events-none opacity-90" />

      {/* Mouse‑following glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: 'radial-gradient(circle 180px at var(--mouse-x, 50%) var(--mouse-y, 50%), var(--accent-soft), transparent 70%)',
          transition: 'background 0.08s linear',
        }}
      />

      {/* Vignette */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, var(--bg) 95%)',
        }}
      />
    </div>
  );
}