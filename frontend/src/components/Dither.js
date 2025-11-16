import React, { useRef, useEffect } from 'react';

function Dither({
  waveColor = [0.5, 0.5, 0.5],
  disableAnimation = false,
  enableMouseInteraction = true,
  mouseRadius = 0.3,
  colorNum = 4,
  waveAmplitude = 0.3,
  waveFrequency = 3,
  waveSpeed = 0.05
}) {
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const mousePosRef = useRef({ x: 0.5, y: 0.5 });
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      ctx.fillStyle = `rgb(${Math.floor(waveColor[0] * 255)}, ${Math.floor(waveColor[1] * 255)}, ${Math.floor(waveColor[2] * 255)})`;
      ctx.fillRect(0, 0, width, height);

      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const index = (y * width + x) * 4;
          
          // Calculate wave effect
          const normalizedX = x / width;
          const normalizedY = y / height;
          
          let wave = 0;
          if (!disableAnimation) {
            wave = Math.sin((normalizedX * waveFrequency + timeRef.current) * Math.PI * 2) * waveAmplitude;
            wave += Math.sin((normalizedY * waveFrequency + timeRef.current) * Math.PI * 2) * waveAmplitude;
          }

          // Mouse interaction
          if (enableMouseInteraction) {
            const dx = normalizedX - mousePosRef.current.x;
            const dy = normalizedY - mousePosRef.current.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const mouseEffect = Math.max(0, 1 - dist / mouseRadius) * waveAmplitude;
            wave += mouseEffect;
          }

          // Apply dithering
          const value = waveColor[0] + wave;
          const dithered = Math.floor(value * colorNum) / colorNum;
          const finalValue = Math.max(0, Math.min(1, dithered));

          data[index] = Math.floor(finalValue * 255);     // R
          data[index + 1] = Math.floor(finalValue * 255); // G
          data[index + 2] = Math.floor(finalValue * 255); // B
          data[index + 3] = 255;                          // A
        }
      }

      ctx.putImageData(imageData, 0, 0);

      if (!disableAnimation) {
        timeRef.current += waveSpeed;
        animationFrameRef.current = requestAnimationFrame(draw);
      }
    };

    const handleMouseMove = (e) => {
      if (!enableMouseInteraction) return;
      const rect = canvas.getBoundingClientRect();
      mousePosRef.current.x = (e.clientX - rect.left) / rect.width;
      mousePosRef.current.y = (e.clientY - rect.top) / rect.height;
    };

    const handleResize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      draw();
    };

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    
    canvas.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);
    
    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      canvas.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
    };
  }, [waveColor, disableAnimation, enableMouseInteraction, mouseRadius, colorNum, waveAmplitude, waveFrequency, waveSpeed]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'block'
      }}
    />
  );
}

export default Dither;

