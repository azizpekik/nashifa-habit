'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { LayoutDashboard, Box, Users, LogOut, Loader2 } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/admin', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/admin/templates', label: 'Template', icon: Box },
  { href: '/admin/users', label: 'User', icon: Users },
]

function AdminNav({ pathname }: { pathname: string }) {
  return (
    <nav className="w-56 shrink-0 border-r bg-muted/30 hidden md:flex flex-col p-4 min-h-screen">
      <div className="flex items-center gap-2 px-3 pb-6 mb-2 border-b">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-primary-foreground text-xs font-bold">NH</span>
        </div>
        <span className="font-semibold text-sm">Admin Panel</span>
      </div>
      <div className="space-y-1 mt-4">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push('/login')
        return
      }
      supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data?.role !== 'admin') {
            router.push('/dashboard')
            return
          }
          setChecking(false)
        })
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <AdminNav pathname={pathname} />
      <div className="flex-1 min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 py-3 border-b bg-card sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground text-xs font-bold">NH</span>
            </div>
            <span className="font-semibold text-sm">Admin</span>
          </div>
          <div className="flex gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </div>
        </div>
        <div className="p-4 md:p-6 max-w-5xl">
          {children}
        </div>
      </div>
    </div>
  )
}
