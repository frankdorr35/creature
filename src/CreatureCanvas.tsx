import React, { useRef, useEffect } from 'react';
import { usePetStore } from './store';

interface CanvasProps {
  width: number;
  height: number;
}

const CreatureCanvas: React.FC<CanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Subscribe to needed states
  const { mood, isSleeping, health } = usePetStore();

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
    
    // Draw loop
    const render = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.1); // delta time in seconds, capped
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      // Environment (simple ground)
      ctx.fillStyle = '#4CAF50';
      ctx.fillRect(0, centerY + 20, width, height - centerY);

      // Animation parameters
      time += 0.05;
      
      let yOffset = 0;
      let bounceSpeed = 1;
      let scaleY = 1;
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

      if (!isAction) {
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
      ctx.scale(direction, scaleY);
      
      // Shadow
      if (!isSleeping) {
         // Shadow needs to be un-flipped horizontally so light source is consistent
         ctx.save();
         ctx.scale(direction, 1); 
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

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [mood, isSleeping, health, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} style={{ display: 'block', margin: '0 auto', background: '#e0f7fa' }} />;
};

export default CreatureCanvas;
