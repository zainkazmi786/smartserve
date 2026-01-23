import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnalogCountdownTimerProps {
  timeoutAt: string | Date;
  size?: number;
  className?: string;
}

export function AnalogCountdownTimer({
  timeoutAt,
  size = 120,
  className,
}: AnalogCountdownTimerProps) {
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  useEffect(() => {
    const calculateRemaining = () => {
      const timeout = new Date(timeoutAt).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((timeout - now) / 1000));
      setRemainingSeconds(remaining);
    };

    // Calculate immediately
    calculateRemaining();

    // Update every second
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [timeoutAt]);

  // Don't render if time has expired
  if (remainingSeconds <= 0) {
    return null;
  }

  const center = size / 2;
  const radius = size / 2 - 10;
  const circumference = 2 * Math.PI * radius;
  
  // Calculate progress (0 to 1)
  const totalSeconds = 20; // Backend sets 20 seconds timeout
  const progress = remainingSeconds / totalSeconds;
  const strokeDashoffset = circumference * (1 - progress);

  // Color based on remaining time
  const getColor = () => {
    if (remainingSeconds > 12) return '#22c55e'; // green
    if (remainingSeconds > 6) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  const color = getColor();

  // Calculate single hand angle
  // Hand rotates from 12 o'clock (0°) to full circle (360°)
  // Start at -90° (12 o'clock position) and rotate clockwise
  const handAngle = (360 / totalSeconds) * (totalSeconds - remainingSeconds) - 90;

  return (
    <div
      className={cn('relative flex flex-col items-center justify-center', className)}
      style={{ width: size, height: size + 60 }} // Extra height for text below
    >
      {/* Analog Clock Face */}
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-muted/20"
        />
        
        {/* Progress circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />

        {/* Single clock hand */}
        <line
          x1={center}
          y1={center}
          x2={center}
          y2={center - radius * 0.7}
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          transform={`rotate(${handAngle} ${center} ${center})`}
          className="transition-all duration-1000 ease-linear"
        />

        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r="4"
          fill={color}
        />
      </svg>

      {/* Digital Display - Outside clock, below */}
      <div className="mt-3 text-center">
        <div
          className="text-3xl font-bold tabular-nums"
          style={{ color }}
        >
          {remainingSeconds}s
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Long Order
        </div>
      </div>
    </div>
  );
}
