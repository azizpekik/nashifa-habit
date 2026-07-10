'use client'

import { useEffect, useState } from 'react'

type Props = {
  done: number
  total: number
  size?: number
  strokeWidth?: number
}

export default function ProgressRing({ done, total, size = 64, strokeWidth = 6 }: Props) {
  const [animatedOffset, setAnimatedOffset] = useState(0)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const progress = total > 0 ? done / total : 0

  useEffect(() => {
    const target = circumference * (1 - progress)
    const timeout = setTimeout(() => setAnimatedOffset(target), 50)
    return () => clearTimeout(timeout)
  }, [progress, circumference])

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#FDAA3E"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={animatedOffset}
          style={{ transition: 'stroke-dashoffset 600ms ease-out' }}
        />
      </svg>
      <span className="absolute text-sm font-bold">
        {done}/{total}
      </span>
    </div>
  )
}
