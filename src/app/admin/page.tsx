'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { Users, UserCheck, Crown, CheckSquare } from 'lucide-react'

type Summary = {
  total_users: number
  active_7d: number
  total_pro: number
  checkins_today: number
}

export default function AdminPage() {
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const res = await fetch('/api/admin/summary')
      if (res.ok) {
        const data = await res.json()
        setSummary(data)
      }
      setLoading(false)
    }

    load()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const cards = [
    { label: 'Total User', value: summary?.total_users || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950' },
    { label: 'Aktif 7 Hari', value: summary?.active_7d || 0, icon: UserCheck, color: 'text-green-600', bg: 'bg-green-50 dark:bg-green-950' },
    { label: 'User Pro', value: summary?.total_pro || 0, icon: Crown, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950' },
    { label: 'Check-in Hari Ini', value: summary?.checkins_today || 0, icon: CheckSquare, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-950' },
  ]

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Ringkasan</h1>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-muted rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cards.map((card) => (
            <div
              key={card.label}
              className="rounded-2xl bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] p-5"
            >
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold tabular-nums">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
