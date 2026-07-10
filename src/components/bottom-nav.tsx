'use client'

import { usePathname } from 'next/navigation'
import { LayoutDashboard, BarChart3, Settings, Plus } from 'lucide-react'

const TABS = [
  { href: '/dashboard', label: 'Hari Ini', icon: LayoutDashboard },
  { href: '/dashboard/reports', label: 'Laporan', icon: BarChart3 },
  { href: '/dashboard/settings', label: 'Pengaturan', icon: Settings },
] as const

type Props = {
  onAddClick: () => void
}

export default function BottomNav({ onAddClick }: Props) {
  const pathname = usePathname()

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 border-t bg-background/80 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-1">
        {TABS.map((tab) => {
          const isActive = pathname === tab.href
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={`relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <tab.icon className="h-5 w-5" />
              {tab.label}
            </a>
          )
        })}

        <button
          type="button"
          onClick={onAddClick}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95"
        >
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  )
}
