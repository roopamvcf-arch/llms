import { useState, useEffect, useRef } from "react";

interface VideoWatermarkProps {
  username: string;
}

export function VideoWatermark({ username }: VideoWatermarkProps) {
  const [position, setPosition] = useState({ x: 10, y: 10 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const move = () => {
      const maxX = 70;
      const maxY = 70;
      setPosition({
        x: Math.random() * maxX,
        y: Math.random() * maxY,
      });
    };
    const interval = setInterval(move, 8000);
    return () => clearInterval(interval);
  }, []);

  const text = `${username} • ${new Date().toLocaleDateString()}`;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 10 }}
    >
      <div
        style={{
          position: "absolute",
          left: `${position.x}%`,
          top: `${position.y}%`,
          transform: "rotate(-28deg)",
          color: "rgba(249, 115, 22, 0.28)",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "14px",
          fontWeight: 600,
          whiteSpace: "nowrap",
          transition: "left 3.5s ease-in-out, top 3.5s ease-in-out",
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {text}
      </div>
    </div>
  );
}
