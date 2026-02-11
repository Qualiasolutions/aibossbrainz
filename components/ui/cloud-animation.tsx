"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
}

interface CloudAnimationProps {
  className?: string;
  particleColor?: string;
  particleCount?: number;
}

export function CloudAnimation({
  className = "",
  particleColor = "rgba(255, 255, 255, 0.9)",
  particleCount = 200,
}: CloudAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef<number>(undefined);
  const timerRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  const initParticles = (canvas: HTMLCanvasElement) => {
    particlesRef.current = [];

    for (let i = 0; i < particleCount; i++) {
      const randomX =
        Math.floor(
          Math.random() * (canvas.width * 3 - canvas.width * 1.2 + 1),
        ) +
        canvas.width * 1.2;

      const randomY =
        Math.floor(Math.random() * (canvas.height - canvas.height * -0.2 + 1)) +
        canvas.height * -0.2;

      const size = canvas.width / 1200;
      const opacity = 0.3 + Math.random() * 0.7;

      particlesRef.current.push({ x: randomX, y: randomY, size, opacity });
    }
  };

  const draw = (
    canvas: HTMLCanvasElement,
    context: CanvasRenderingContext2D,
  ) => {
    timerRef.current++;
    context.setTransform(1, 0, 0, 1, 0, 0);

    const distanceX = canvas.width / 100;
    const growthRate = canvas.width / 1200;

    context.clearRect(0, 0, canvas.width, canvas.height);

    particlesRef.current.forEach((particle) => {
      context.beginPath();

      if (timerRef.current < 80) {
        particle.x = particle.x - distanceX;
        particle.size = particle.size + growthRate;
      }

      if (timerRef.current > 80 && timerRef.current < 600) {
        particle.x = particle.x - distanceX * 0.015;
        particle.size = particle.size + growthRate * 0.15;
      }

      context.fillStyle = particleColor;
      context.globalAlpha = particle.opacity;
      context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      context.fill();
    });

    context.globalAlpha = 1;

    if (timerRef.current > 600) {
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }
      return;
    }

    requestIdRef.current = requestAnimationFrame(() => draw(canvas, context));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      timerRef.current = 0;
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }

      context.reset?.();
      initParticles(canvas);
      draw(canvas, context);
    };

    resize();
    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      if (requestIdRef.current) {
        cancelAnimationFrame(requestIdRef.current);
      }
    };
  }, [draw, initParticles]);

  return (
    <canvas ref={canvasRef} className={`pointer-events-none ${className}`} />
  );
}
