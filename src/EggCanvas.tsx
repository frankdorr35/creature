import React, { useRef, useEffect, useState } from 'react';
import { usePetStore } from './store';
import { environment } from './environment';

interface CanvasProps {
  width: number;
  height: number;
}

const EggCanvas: React.FC<CanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isWarming, setIsWarming] = useState(false);
  
  const { 
    warmth, 
    bond, 
    stability, 
    isWobbling, 
    particles, 
    removeParticle,
    warmEgg,
    hatch
  } = usePetStore();

  // Handle warming interactions
  const handlePointerDown = () => { setIsWarming(true); warmEgg(); };
  const handlePointerUp = () => setIsWarming(false);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isWarming) {
        interval = setInterval(warmEgg, 500); // Continuous warming if held
    }
    return () => clearInterval(interval);
  }, [isWarming, warmEgg]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let lastTime = performance.now();
    
    // Hatching sequence state
    let isHatching = false;
    let hatchProgress = 0; // 0 to 1

    if (bond >= 100) {
        isHatching = true;
    }

    const centerX = width / 2;
    const centerY = height / 2 + 50;
    
    // Map to track local visual state of particles spawned from store
    const localParticles = new Map<string, { x: number, y: number }>();
    
    // Particle system update loop integrated into render
    
    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Living Habitat Environment
      environment.init(width, height);
      environment.render(ctx, dt);

      // Draw the dirt nest over the environment hills
      ctx.fillStyle = '#8b7355'; // Dirt/nest color
      ctx.beginPath();
      ctx.ellipse(centerX, centerY + 40, width * 0.4, 40, 0, 0, Math.PI * 2);
      ctx.fill();

      time += 0.05;

      // Handle hatching sequence
      if (isHatching) {
          hatchProgress += 0.01;
          if (hatchProgress > 1) {
              hatch(); // Trigger store transition to False, unmounting this component
              return;
          }
      }

      ctx.save();
      ctx.translate(centerX, centerY);

      // Wobble math
      let angle = 0;
      if (isHatching) {
         angle = Math.sin(time * 20) * (0.1 + hatchProgress); // Violent shake
      } else if (isWobbling) {
         const intensity = (100 - stability) / 100;
         angle = Math.sin(time * (5 + intensity * 10)) * (0.1 + intensity * 0.3);
      } else {
         // Gentle idle bob
         const bobY = Math.sin(time) * 3;
         ctx.translate(0, bobY);
      }
      
      ctx.rotate(angle);

      // --- Draw Egg ---
      
      // Glow (if warming)
      if (isWarming && !isHatching) {
          const gradient = ctx.createRadialGradient(0, -20, 30, 0, -20, 80 + Math.sin(time*5)*10);
          gradient.addColorStop(0, 'rgba(255, 200, 100, 0.4)');
          gradient.addColorStop(1, 'rgba(255, 200, 100, 0)');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(0, -20, 100, 0, Math.PI * 2);
          ctx.fill();
      }

      // Base Egg Shape
      ctx.beginPath();
      ctx.moveTo(0, -70);
      ctx.bezierCurveTo(40, -70, 50, 0, 40, 30);
      ctx.bezierCurveTo(20, 45, -20, 45, -40, 30);
      ctx.bezierCurveTo(-50, 0, -40, -70, 0, -70);
      
      // Color based on warmth (Cold = bluish, Warm = pale yellow/white)
      const warmthFactor = Math.min(100, Math.max(0, warmth)) / 100;
      // Interpolate between cold (#d0e0e3) and perfect (#faf8ef)
      const r = Math.round(208 + warmthFactor * 42);
      const g = Math.round(224 + warmthFactor * 24);
      const b = Math.round(227 + warmthFactor * 12);
      
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      
      if (isHatching) {
          ctx.globalAlpha = 1 - hatchProgress;
      }
      
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(0,0,0,0.1)';
      ctx.stroke();

      // Speckles
      ctx.fillStyle = 'rgba(100, 80, 60, 0.2)';
      const seedRandom = (seed: number) => {
          const x = Math.sin(seed++) * 10000;
          return x - Math.floor(x);
      };
      
      for(let i=0; i<30; i++) {
         const px = (seedRandom(i) - 0.5) * 60;
         const py = (seedRandom(i+100) - 0.5) * 80 - 10;
         // Very rough bounds check for the oval
         if ((px*px)/900 + (py*py)/2500 < 1) {
             ctx.beginPath();
             ctx.arc(px, py, seedRandom(i+200)*2 + 1, 0, Math.PI*2);
             ctx.fill();
         }
      }

      // Cracks (based on bond)
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1.5;
      
      const drawCrack = (startX: number, startY: number, path: [number, number][]) => {
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          for(const [dx, dy] of path) {
              ctx.lineTo(startX + dx, startY + dy);
          }
          ctx.stroke();
      };

      if (bond > 25 || isHatching) {
          // Base crack
          drawCrack(-10, 30, [[-15, -10], [-5, -25], [-20, -35]]);
      }
      if (bond > 50 || isHatching) {
          // Middle crack
          drawCrack(20, 10, [[10, -5], [25, -20], [15, -40]]);
      }
      if (bond > 75 || isHatching) {
          // Top crack
          drawCrack(-5, -60, [[5, -45], [-10, -30], [8, -15]]);
      }
      
      // Reset alpha
      ctx.globalAlpha = 1;

      ctx.restore();

      // --- Particles ---
      particles.forEach(p => {
         // Create local replica if we haven't seen this particle yet
         if (!localParticles.has(p.id)) {
             localParticles.set(p.id, { x: p.x, y: p.y });
         }

         const lp = localParticles.get(p.id)!;
         
         // Visual update (local only, no store mutation)
         lp.y -= 0.5; // Float up
         if (!isHatching) {
            ctx.fillStyle = p.type === 'music' ? '#ff69b4' : '#4a90e2';
            ctx.font = '20px Arial';
            ctx.fillText(p.type === 'music' ? '♫' : '💬', centerX + lp.x, centerY + lp.y);
         }
         
         // If they float too high, remove from global store (which will then remove it from our next frame loop)
         if (lp.y < -150) {
             setTimeout(() => removeParticle(p.id), 0);
         }
      });
      
      // Clean up local particle map for items that got removed from store
      for (const [id] of localParticles) {
          if (!particles.find(p => p.id === id)) {
              localParticles.delete(id);
          }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [warmth, bond, stability, isWobbling, isWarming, particles, hatch, removeParticle, width, height]);

  return (
    <div style={{ position: 'relative' }}>
       <canvas 
          ref={canvasRef} 
          width={width} 
          height={height} 
          style={{ display: 'block', margin: '0 auto', cursor: 'pointer' }}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
       />
       {isWobbling && !isWarming && (
           <div style={{ position: 'absolute', top: 20, width: '100%', textAlign: 'center', color: '#e74c3c', fontWeight: 'bold' }}>
               THE EGG IS WOBBLING! Click "Steady"
           </div>
       )}
    </div>
  );
};

export default EggCanvas;
