import React, { useEffect, useRef } from 'react';

const MatrixBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropsRef = useRef<{ pos: number; speed: number }[]>([]);
  const lastSizeRef = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const fontSize = 27;
    const verticalSpacing = fontSize * 3.5; // Increased vertical spacing

    // Initialize or update drops while preserving positions
    const updateDrops = (width: number) => {
      const columns = Math.ceil(width / fontSize);
      const currentDrops = dropsRef.current;
      const newDrops: { pos: number; speed: number }[] = [];

      // Calculate scale factor for position adjustment
      const scaleFactor = width / (lastSizeRef.current.width || width);

      for (let i = 0; i < columns; i++) {
        if (i < currentDrops.length) {
          // Adjust existing drop position based on new width
          newDrops[i] = {
            pos: currentDrops[i].pos * scaleFactor,
            speed: currentDrops[i].speed
          };
        } else {
          // Add new drops for additional columns with more spacing
          newDrops[i] = {
            pos: (Math.random() * canvas.height / verticalSpacing) - 10,
            speed: 0.3 + Math.random() * 0.5 // Slower, more consistent speeds
          };
        }
      }
      dropsRef.current = newDrops;
      lastSizeRef.current = { width, height: canvas.height };
    };

    // Set canvas size and initialize drops
    const resizeCanvas = () => {
      const { innerWidth, innerHeight } = window;
      canvas.width = innerWidth;
      canvas.height = innerHeight;
      ctx.font = `${fontSize}px monospace`;
      
      if (dropsRef.current.length === 0) {
        // First time initialization
        updateDrops(innerWidth);
      } else {
        // Update existing drops on resize
        updateDrops(innerWidth);
      }
    };

    // Initial setup
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Matrix characters
    const chars = '369';

    const draw = () => {
      // Semi-transparent black background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.02)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // SINGLE COLOR Green:#00ff00 | Grey: #808080 | Red: #ff0000 | Blue: #0000f
      ctx.fillStyle = '#808080';
      ctx.font = `${fontSize}px monospace`;

      // Update and draw drops
      dropsRef.current.forEach((drop, i) => {
        const char = chars[Math.floor(Math.random() * chars.length)];
        
        ctx.fillText(
          char,
          i * fontSize,
          drop.pos * verticalSpacing
        );

        // Update position
        drop.pos += drop.speed;

        // Reset to top when reaching bottom
        if (drop.pos * verticalSpacing > canvas.height) {
          if (Math.random() > 0.985) {
            drop.pos = -2 - Math.random() * 5; // Start above screen with random offset
            drop.speed = 0.3 + Math.random() * 0.5; // Reset to slower speed
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full -z-10 opacity-30"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  );
};

export default MatrixBackground;