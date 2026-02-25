import React, { useRef, useEffect } from 'react';
import { usePetStore, type Trick } from './store';
import { environment } from './environment';

interface CanvasProps {
  width: number;
  height: number;
}

interface Sparkle { x: number; y: number; age: number; life: number; size: number }

interface InteractionParticle {
    id: string;
    x: number;
    y: number;
    vx: number;
    vy: number;
    age: number;
    life: number;
    type: 'crumb' | 'droplet' | 'confetti' | 'heart' | 'star' | 'puff' | 'shell' | 'text';
    text?: string;
    size: number;
    color: string;
}

const CreatureCanvas: React.FC<CanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Subscribe to needed states
  const { mood, isSleeping, health, tricks } = usePetStore();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let time = 0;
    let lastTime = performance.now();

    // Base properties
    const centerX = width / 2;
    const centerY = height / 2 + 50;
    
    // Wandering state
    let x = centerX;
    let targetX = centerX;
    let pauseTimer = 2; // Initial pause before first move
    let direction = 1; // 1 for right, -1 for left
    
    // Trick state
    let trickCheckTimer = 15; // 15 to 30 second interval
    let activeTrick: Trick | null = null;
    let trickDuration = 0;
    let trickTime = 0;
    let sparkles: Sparkle[] = [];
    let activeParticles: InteractionParticle[] = [];
    
    // Draw loop
    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1); // delta time in seconds, capped
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Living Habitat Environment
      environment.init(width, height);
      environment.render(ctx, dt);

      // Animation parameters
      time += 0.05;

      // Handle Interaction Events
      const events = usePetStore.getState().interactionEvents;
      if (events.length > 0) {
          events.forEach(e => {
              let count = 0;
              let pType: InteractionParticle['type'] = 'crumb';
              let color = '#fff';
              
              switch(e.type) {
                  case 'feed': count = 6; pType = 'crumb'; color = '#8B4513'; break;
                  case 'water': count = 8; pType = 'droplet'; color = '#4da6ff'; break;
                  case 'play': count = 12; pType = 'confetti'; break;
                  case 'pet': count = 4; pType = 'heart'; color = '#ff4d4d'; break;
                  case 'teachSuccess': count = 10; pType = 'star'; color = '#ffd700'; break;
                  case 'teachFail': count = 5; pType = 'puff'; color = '#999'; break;
                  case 'hatch': count = 15; pType = 'shell'; color = '#fff'; break;
              }

              for(let i=0; i<count; i++) {
                 let vx = (Math.random() - 0.5) * 100;
                 let vy = (Math.random() - 0.5) * 100;
                 let life = 1 + Math.random();
                 let size = 3 + Math.random() * 5;
                 let spawnX = x + (Math.random() - 0.5) * 50;
                 let spawnY = centerY + yOffset + (Math.random() - 0.5) * 50;

                 if (e.type === 'feed') { spawnY = centerY - 60 - Math.random() * 20; vy = 50 + Math.random() * 50; vx *= 0.2; }
                 else if (e.type === 'water') { spawnY = centerY + 20; vy = -50 - Math.random() * 50; }
                 else if (e.type === 'pet') { vy = -30 - Math.random() * 40; vx *= 0.3; size = 8 + Math.random() * 4; }
                 else if (e.type === 'play' || e.type === 'hatch') { vy = -80 - Math.random() * 100; vx *= 2; }
                 else if (e.type === 'teachSuccess') { vy = -100 - Math.random() * 50; vx = (i % 2 === 0 ? 1 : -1) * 50; }
                 else if (e.type === 'teachFail') { vy = -20 - Math.random() * 20; vx *= 0.5; size = 6 + Math.random() * 4; }

                 if (e.type === 'play') {
                     const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
                     color = colors[Math.floor(Math.random() * colors.length)];
                 }

                 activeParticles.push({
                     id: Math.random().toString(),
                     x: spawnX, y: spawnY, vx, vy, age: 0, life, type: pType, size, color
                 });
              }
              
              if (e.text) {
                 activeParticles.push({
                     id: Math.random().toString(),
                     x: x, y: centerY - 60, vx: 0, vy: -30, age: 0, life: 2, type: 'text', size: 16, color: '#333', text: e.text
                 });
              }
              
              usePetStore.getState().consumeInteractionEvent(e.id);
          });

          if (activeParticles.length > 30) {
              activeParticles = activeParticles.slice(activeParticles.length - 30);
          }
      }
      
      let yOffset = 0;
      let bounceSpeed = 1;
      let scaleY = 1;
      let scaleX = 1;
      let rotate = 0;
      let eyeColor = 'white';
      
      // Mood adjustments
      switch (mood) {
          case 'happy':
              bounceSpeed = 1.5;
              yOffset = Math.sin(time * bounceSpeed) * 15;
              break;
          case 'sad':
              bounceSpeed = 0.5;
              yOffset = Math.sin(time * bounceSpeed) * 5;
              scaleY = 0.9;
              break;
          case 'sick':
              bounceSpeed = 0.2;
              yOffset = Math.sin(time * bounceSpeed) * 2;
              scaleY = 0.8;
              eyeColor = '#ffcccc';
              break;
          case 'eating':
              yOffset = Math.abs(Math.sin(time * 3)) * 10;
              break;
          case 'drinking':
              yOffset = Math.abs(Math.sin(time * 3)) * 10;
              break;
          case 'playing':
              bounceSpeed = 2;
              yOffset = Math.abs(Math.sin(time * bounceSpeed * 2)) * 20;
              break;
          case 'sleeping':
              yOffset = 10 + Math.sin(time * 0.5) * 5; // Slow breathing
              scaleY = 0.85;
              break;
          default:
              yOffset = Math.sin(time) * 5;
              break;
      }

      // Wandering logic
      const isAction = mood === 'eating' || mood === 'drinking' || mood === 'playing' || isSleeping;
      
      let walkSpeed = 50; // pixels per second
      let maxPause = 8;
      let minPause = 2;

      // Adjust based on mood
      switch (mood) {
          case 'happy':
              walkSpeed = 80;
              maxPause = 4;
              minPause = 1;
              break;
          case 'sad':
          case 'sick':
              walkSpeed = 25;
              maxPause = 12;
              minPause = 5;
              break;
      }
      
      // Energy influence
      walkSpeed *= (0.5 + (health / 200)); // Scales between 50% and 100% speed

      // Autonomous Tricks check
      if (!isAction && !activeTrick) {
          trickCheckTimer -= dt;
          if (trickCheckTimer <= 0) {
              // Roll for trick (30% chance)
              if (Math.random() < 0.3) {
                  const learnedTricks = (Object.keys(tricks) as Trick[]).filter(t => tricks[t].learned);
                  if (learnedTricks.length > 0) {
                      activeTrick = learnedTricks[Math.floor(Math.random() * learnedTricks.length)];
                      trickTime = 0;
                      
                      // Setup trick durations
                      if (activeTrick === 'sit') trickDuration = 2;
                      if (activeTrick === 'spin') trickDuration = 1;
                      if (activeTrick === 'wave') trickDuration = 2;
                      if (activeTrick === 'dance') trickDuration = 3;
                      
                      // Spawn sparkles
                      for(let i=0; i<5; i++) {
                         sparkles.push({
                             x: (Math.random() - 0.5) * 60,
                             y: (Math.random() - 1.0) * 80,
                             age: 0,
                             life: 0.5 + Math.random() * 1.5,
                             size: 2 + Math.random() * 4
                         });
                      }
                  }
              }
              // Reset timer (15-30 seconds)
              trickCheckTimer = 15 + Math.random() * 15;
          }
      }

      // Handle active trick overrides
      if (activeTrick) {
         trickTime += dt;
         if (trickTime >= trickDuration) {
             activeTrick = null; // Trick finished
         } else {
             // Apply Trick Animations
             if (activeTrick === 'sit') {
                 scaleY = 0.6;
                 scaleX = 1.2;
                 yOffset = 15; // Squish down
                 // Pop back up at the very end
                 if (trickTime > trickDuration - 0.2) {
                     scaleY = 1.2;
                     scaleX = 0.8;
                     yOffset = -10;
                 }
             } else if (activeTrick === 'spin') {
                 // 360 over 1 second
                 rotate = (trickTime / trickDuration) * Math.PI * 2;
             } else if (activeTrick === 'wave') {
                 // Waving handled in custom draw section below, body stays mostly still
             } else if (activeTrick === 'dance') {
                 // Rapid bouncing left and right
                 yOffset = Math.abs(Math.sin(time * 15)) * 15;
                 x += Math.sin(time * 10) * 2; // subtle shaking x
                 scaleY = 0.9 + Math.abs(Math.sin(time * 15)) * 0.2;
                 rotate = Math.sin(time * 8) * 0.2;
             }

             // Float text
             ctx.fillStyle = '#f39c12';
             ctx.font = 'bold 16px "Comic Sans MS", cursive, sans-serif';
             ctx.textAlign = 'center';
             ctx.fillText(`✨ ${activeTrick.charAt(0).toUpperCase() + activeTrick.slice(1)}!`, x, centerY - 80 - (trickTime * 15));
         }
      }

      if (!isAction && !activeTrick) {
          if (pauseTimer > 0) {
              pauseTimer -= dt;
          } else {
              const dx = targetX - x;
              if (Math.abs(dx) > 2) {
                  direction = dx > 0 ? 1 : -1;
                  x += direction * walkSpeed * dt;
                  
                  // Add walking bob to the idle yOffset
                  yOffset += Math.abs(Math.sin(time * 8)) * 8; 
                  
                  // Slight lean forward while walking
                  // (Handled via rotation if we wanted, but scale/translate is enough here)
              } else {
                  x = targetX;
                  pauseTimer = minPause + Math.random() * (maxPause - minPause);
                  // Pick new target within canvas bounds (with margin)
                  const margin = 60;
                  targetX = margin + Math.random() * (width - margin * 2);
              }
          }
      }

      const bodyColor = health < 40 ? '#8e9b90' : '#4a90e2';

      ctx.save();
      // Translate to the dynamic X position instead of centerX
      ctx.translate(x, centerY + yOffset);
      
      // Scale handles flipping horizontally and vertical squish
      ctx.scale(direction * scaleX, scaleY);
      ctx.rotate(rotate);
      
      // Shadow
      if (!isSleeping) {
         // Shadow needs to be un-flipped horizontally so light source is consistent
         ctx.save();
         ctx.rotate(-rotate);
         ctx.scale(direction * scaleX, 1); 
         ctx.fillStyle = 'rgba(0,0,0,0.2)';
         ctx.beginPath();
         // Shadow squishes opposite to bounce
         ctx.ellipse(0, 30 - yOffset, 40 + (yOffset * 0.5), 10, 0, 0, Math.PI * 2);
         ctx.fill();
         ctx.restore();
      }

      // Body (blob shape)
      ctx.fillStyle = bodyColor;
      ctx.beginPath();
      // Simple blob using bezier curves
      ctx.moveTo(0, -50);
      ctx.bezierCurveTo(40, -50, 50, 0, 40, 30);
      ctx.bezierCurveTo(20, 40, -20, 40, -40, 30);
      ctx.bezierCurveTo(-50, 0, -40, -50, 0, -50);
      ctx.fill();

      // Appended limbs logic for wave
      if (activeTrick === 'wave') {
          ctx.fillStyle = bodyColor;
          ctx.beginPath();
          // Wave angle sweeps back and forth
          const waveAngle = Math.sin(time * 15) * 0.8;
          ctx.save();
          if (direction === 1) {
            ctx.translate(40, 0); // Right side
          } else {
            ctx.translate(-40, 0); // Left side
          }
          ctx.rotate(waveAngle - 0.5);
          ctx.ellipse(0, -15, 8, 20, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
      }

      // Eyes
      ctx.fillStyle = eyeColor;
      if (isSleeping) {
          // Closed eyes
          ctx.beginPath();
          ctx.strokeStyle = '#222';
          ctx.lineWidth = 2;
          ctx.moveTo(-20, -10);
          ctx.quadraticCurveTo(-15, -5, -10, -10);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(10, -10);
          ctx.quadraticCurveTo(15, -5, 20, -10);
          ctx.stroke();
      } else {
          // Open eyes
          // Left eye
          ctx.beginPath();
          ctx.arc(-15, -10, 8, 0, Math.PI * 2);
          ctx.fill();
          // Right eye
          ctx.beginPath();
          ctx.arc(15, -10, 8, 0, Math.PI * 2);
          ctx.fill();

          // Pupils
          ctx.fillStyle = '#222';
          let pupilY = -10;
          if (mood === 'sad') pupilY = -8;
          if (mood === 'happy') pupilY = -12;

          ctx.beginPath();
          ctx.arc(-15, pupilY, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(15, pupilY, 3, 0, Math.PI * 2);
          ctx.fill();
      }
      
      // Mouth
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;
      ctx.beginPath();
      if (mood === 'happy' || mood === 'playing') {
          ctx.arc(0, 5, 10, 0, Math.PI, false);
      } else if (mood === 'sad' || mood === 'sick') {
          ctx.arc(0, 15, 10, Math.PI, Math.PI*2, false);
      } else if (mood === 'eating') {
          ctx.arc(0, 5, Math.abs(Math.sin(time * 5)) * 5, 0, Math.PI * 2);
          ctx.fillStyle = '#222';
          ctx.fill();
      } else {
          ctx.moveTo(-5, 5);
          ctx.lineTo(5, 5);
      }
      ctx.stroke();

      ctx.restore();

      // Draw active trick sparkles overlay (unaffected by creature scale/rotation)
      if (sparkles.length > 0) {
          ctx.save();
          ctx.translate(x, centerY + yOffset);
          for (let i = sparkles.length - 1; i >= 0; i--) {
              const s = sparkles[i];
              s.age += dt;
              if (s.age >= s.life) {
                  sparkles.splice(i, 1);
                  continue;
              }
              const progress = s.age / s.life;
              ctx.globalAlpha = 1 - progress;
              ctx.fillStyle = '#ffd700'; // Gold
              ctx.beginPath();
              // Star shape
              const cx = s.x;
              const cy = s.y - (progress * 30); // Float up
              const spikes = 4;
              const rot = Math.PI / 2 * 3;
              const step = Math.PI / spikes;
              let tempX = cx;
              let tempY = cy;
              ctx.moveTo(cx, cy - s.size);
              for (let j = 0; j < spikes; j++) {
                  tempX = cx + Math.cos(rot + step * j*2) * s.size;
                  tempY = cy + Math.sin(rot + step * j*2) * s.size;
                  ctx.lineTo(tempX, tempY);
                  tempX = cx + Math.cos(rot + step * (j*2+1)) * (s.size/2);
                  tempY = cy + Math.sin(rot + step * (j*2+1)) * (s.size/2);
                  ctx.lineTo(tempX, tempY);
              }
              ctx.lineTo(cx, cy - s.size);
              ctx.fill();
          }
          ctx.restore();
      }

      // Draw active interaction particles
      for (let i = activeParticles.length - 1; i >= 0; i--) {
         let p = activeParticles[i];
         p.age += dt;
         if (p.age >= p.life) { activeParticles.splice(i, 1); continue; }
         
         p.x += p.vx * dt;
         p.y += p.vy * dt;
         
         // Physics updates
         if (p.type === 'crumb') { p.vy += 250 * dt; } 
         else if (p.type === 'droplet') { p.vy += 300 * dt; } 
         else if (p.type === 'confetti' || p.type === 'shell') { p.vy += 200 * dt; } 
         else if (p.type === 'star') { p.vx += Math.cos(p.age * 8) * 300 * dt; } // Spiral
         else if (p.type === 'puff') { p.vx += Math.sin(p.age * 5) * 50 * dt; p.size += 15 * dt; } // Expand 
         
         ctx.globalAlpha = 1 - Math.pow(p.age / p.life, 2); // fade curve
         ctx.fillStyle = p.color;
         
         if (p.type === 'text' && p.text) {
             ctx.font = 'bold 18px "Comic Sans MS", cursive, sans-serif';
             ctx.textAlign = 'center';
             ctx.strokeStyle = 'white';
             ctx.lineWidth = 4;
             ctx.strokeText(p.text, p.x, p.y);
             ctx.fillText(p.text, p.x, p.y);
         } else if (p.type === 'heart') {
             ctx.beginPath();
             const h = p.size;
             ctx.moveTo(p.x, p.y + h/4);
             ctx.quadraticCurveTo(p.x, p.y, p.x - h/2, p.y);
             ctx.quadraticCurveTo(p.x - h, p.y, p.x - h, p.y + h/2.5);
             ctx.quadraticCurveTo(p.x - h, p.y + h, p.x, p.y + h*1.5);
             ctx.quadraticCurveTo(p.x + h, p.y + h, p.x + h, p.y + h/2.5);
             ctx.quadraticCurveTo(p.x + h, p.y, p.x + h/2, p.y);
             ctx.quadraticCurveTo(p.x, p.y, p.x, p.y + h/4);
             ctx.fill();
         } else if (p.type === 'star') {
             ctx.beginPath();
             const spikes = 5;
             const rot = Math.PI / 2 * 3;
             const step = Math.PI / spikes;
             for (let j=0; j<spikes; j++) {
                 ctx.lineTo(p.x + Math.cos(rot + step * j*2) * p.size, p.y + Math.sin(rot + step * j*2) * p.size);
                 ctx.lineTo(p.x + Math.cos(rot + step * (j*2+1)) * (p.size/2), p.y + Math.sin(rot + step * (j*2+1)) * (p.size/2));
             }
             ctx.closePath();
             ctx.fill();
         } else if (p.type === 'droplet') {
             ctx.beginPath();
             ctx.arc(p.x, p.y, p.size, 0, Math.PI, false);
             ctx.lineTo(p.x, p.y - p.size*2);
             ctx.closePath();
             ctx.fill();
         } else {
             if (p.type === 'confetti' || p.type === 'shell') {
                 ctx.save();
                 ctx.translate(p.x, p.y);
                 ctx.rotate(p.age * 10);
                 ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size);
                 ctx.restore();
             } else {
                 ctx.beginPath();
                 ctx.arc(p.x, p.y, p.size, 0, Math.PI*2);
                 ctx.fill();
             }
         }
      }
      ctx.globalAlpha = 1;

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [mood, isSleeping, health, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block', margin: '0 auto' }} />;
};

export default CreatureCanvas;
