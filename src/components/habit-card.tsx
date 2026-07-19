'use client'

import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Check, Ellipsis, Archive } from 'lucide-react'

type Props = {
  id: string
  name: string
  description: string | null
  color: string
  streak: number
  checked: boolean
  scheduledToday: boolean
  sendTime?: string
  daysLabel?: string
  onCheck: () => void
  onClick: () => void
  onArchive?: () => void
}

export default function HabitCard({
  id,
  name,
  description,
  color,
  streak,
  checked,
  scheduledToday,
  sendTime,
  daysLabel,
  onCheck,
  onClick,
  onArchive,
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
  })
  const [showMenu, setShowMenu] = useState(false)

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-sm transition-all ${
        isDragging ? 'z-10 opacity-90 shadow-lg' : ''
      } ${!scheduledToday ? 'opacity-60' : ''}`}
    >
      <div
        className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full"
        style={{ backgroundColor: color }}
      />

      <button
        type="button"
        className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all"
        style={{
          borderColor: checked ? color : 'hsl(var(--border))',
          backgroundColor: checked ? color : 'transparent',
        }}
        onClick={(e) => {
          e.stopPropagation()
          onCheck()
        }}
      >
        {checked && <Check className="h-4 w-4 text-white" />}
      </button>

      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <p className={`text-sm font-medium truncate ${checked ? 'line-through text-muted-foreground' : ''}`}>
          {name}
        </p>
        {description && (
          <p className="text-xs text-muted-foreground truncate">{description}</p>
        )}
        {(sendTime || daysLabel) && (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            {sendTime && <span>{sendTime}</span>}
            {sendTime && daysLabel && <span className="text-muted-foreground/40">•</span>}
            {daysLabel && <span className="truncate">{daysLabel}</span>}
          </div>
        )}
      </div>

      {streak > 0 && (
        <span className="shrink-0 text-xs font-semibold tabular-nums">
          {streak}d{streak >= 3 ? ' 🔥' : ''}
        </span>
      )}

      {onArchive && (
        <div className="relative">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <Ellipsis className="h-4 w-4" />
          </button>
          {showMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
              <div className="absolute right-0 bottom-full mb-1 z-50 min-w-[140px] rounded-xl bg-popover shadow-lg border py-1">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onArchive?.()
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-xs text-left hover:bg-muted transition-colors"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Arsipkan
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        type="button"
        className="flex h-7 w-7 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" />
      </button>
    </div>
  )
}
