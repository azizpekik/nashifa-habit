'use client'

import { useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import BottomNav from '@/components/bottom-nav'
import HabitSheet from '@/components/habit-sheet'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [showCreateSheet, setShowCreateSheet] = useState(false)

  return (
    <>
      <div className="pb-24">
        {children}
      </div>

      <BottomNav onAddClick={() => setShowCreateSheet(true)} />

      <HabitSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        onSuccess={() => {
          setShowCreateSheet(false)
          if (pathname === '/dashboard') {
            router.refresh()
          } else {
            router.push('/dashboard')
          }
        }}
      />
    </>
  )
}
