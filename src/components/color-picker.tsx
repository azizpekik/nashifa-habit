'use client'

const COLORS = [
  '#22c55e',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#a855f7',
  '#f97316',
]

type Props = {
  value: string
  onChange: (color: string) => void
}

export default function ColorPicker({ value, onChange }: Props) {
  return (
    <div className="flex gap-2">
      {COLORS.map((color) => {
        const selected = value === color
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            className={`rounded-full border-2 transition-all cursor-pointer ${
              selected ? 'scale-110 shadow-md' : ''
            }`}
            style={{
              width: selected ? '30px' : '26px',
              height: selected ? '30px' : '26px',
              backgroundColor: color,
              borderColor: selected ? 'white' : 'transparent',
              boxShadow: selected
                ? `0 0 0 2px ${color}, 0 2px 8px ${color}40`
                : 'none',
            }}
          />
        )
      })}
    </div>
  )
}
