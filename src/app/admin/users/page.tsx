'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useCallback } from 'react'
import {
  Search, ChevronLeft, ChevronRight, Loader2, Users as UsersIcon,
  CheckCircle2, Clock, ChevronDown, ChevronUp,
  Bot, User, Download
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

type UserProfile = {
  id: string
  wa_number: string | null
  wa_verified: boolean
  role: string
  opted_out: boolean
  created_at: string
  email: string | null
  habit_count: number
  subscription: {
    plan: string
    status: string
    current_period_end: string
  } | null
}

type UsersResponse = {
  users: UserProfile[]
  total: number
  page: number
  limit: number
}

type HabitWithMeta = {
  id: string
  name: string
  description: string | null
  color: string
  frequency: string
  target_per_week: number | null
  is_active: boolean
  created_at: string
  schedule: { habit_id: string; send_time: string; days_of_week: number[] } | null
  checkins: { total: number; done: number; latest: string | null }
}

type Message = {
  uuid: string
  user_id: string
  role: string
  content: string
  intent: string | null
  created_at?: string
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UsersResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [showUserDialog, setShowUserDialog] = useState(false)
  const [extendDays, setExtendDays] = useState(30)
  const [newPlan, setNewPlan] = useState('')
  const [saving, setSaving] = useState(false)

  const [habits, setHabits] = useState<HabitWithMeta[]>([])
  const [habitsLoading, setHabitsLoading] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatsLoading, setChatsLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'habits' | 'chats'>('habits')
  const [showAllHabits, setShowAllHabits] = useState(false)
  const [msgPage, setMsgPage] = useState(1)
  const MSG_PAGE_SIZE = 20

  const loadUsers = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: page.toString(), limit: '20' })
    if (search) params.set('q', search)

    const res = await fetch(`/api/admin/users?${params}`)
    if (res.ok) {
      setData(await res.json())
    }
    setLoading(false)
  }, [page, search])

  useEffect(() => { loadUsers() }, [loadUsers])

  async function loadHabits(userId: string) {
    setHabitsLoading(true)
    const res = await fetch(`/api/admin/users/${userId}/habits`)
    if (res.ok) setHabits(await res.json())
    setHabitsLoading(false)
  }

  async function loadChats(userId: string) {
    setChatsLoading(true)
    const res = await fetch(`/api/admin/users/${userId}/chats`)
    if (res.ok) {
      const data = await res.json()
      setMessages(Array.isArray(data) ? data : [])
    }
    setChatsLoading(false)
  }

  function openUser(user: UserProfile) {
    setSelectedUser(user)
    setNewPlan(user.subscription?.plan || 'free')
    setExtendDays(30)
    setActiveTab('habits')
    setShowAllHabits(false)
    setMsgPage(1)
    setShowUserDialog(true)
    loadHabits(user.id)
    loadChats(user.id)
  }

  async function handleExtend() {
    if (!selectedUser) return
    setSaving(true)
    const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ extend_days: extendDays }),
    })
    if (res.ok) {
      toast.success(`Subscription diperpanjang ${extendDays} hari`)
      loadUsers()
    } else {
      toast.error('Gagal memperpanjang')
    }
    setSaving(false)
  }

  async function handlePlanChange(plan: string) {
    if (!selectedUser) return
    setSaving(true)
    const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, status: plan === 'free' ? 'cancelled' : 'active' }),
    })
    if (res.ok) {
      toast.success(`Plan diubah ke ${plan}`)
      setNewPlan(plan)
      loadUsers()
    } else {
      toast.error('Gagal mengubah plan')
    }
    setSaving(false)
  }

  async function handleToggleOptOut() {
    if (!selectedUser) return
    const newVal = !selectedUser.opted_out
    const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opt_out: newVal }),
    })
    if (res.ok) {
      toast.success(newVal ? 'Reminder dinonaktifkan' : 'Reminder diaktifkan')
      setSelectedUser({ ...selectedUser, opted_out: newVal })
      loadUsers()
    } else {
      toast.error('Gagal mengubah')
    }
  }

  async function handleDeactivate() {
    if (!selectedUser) return
    setSaving(true)
    const res = await fetch(`/api/admin/users/${selectedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deactivate: true }),
    })
    if (res.ok) {
      toast.success('Semua habit user dinonaktifkan')
      loadUsers()
    } else {
      toast.error('Gagal')
    }
    setSaving(false)
  }

  const totalPages = data ? Math.ceil(data.total / data.limit) : 1

  function dayLabel(day: number) {
    return ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][day]
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function formatTimeChat(date: string) {
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  }

  function exportChatTxt() {
    const lines = messages.map((m) => {
      const ts = m.created_at
        ? new Date(m.created_at).toLocaleDateString('id-ID', {
            weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })
        : ''
      const sender = m.role === 'user' ? 'User' : 'Bot'
      return `[${ts}] ${sender}: ${m.content}`
    }).join('\n')

    const blob = new Blob([lines], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `chat-${selectedUser?.wa_number || selectedUser?.email || 'unknown'}-${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const visibleHabits = showAllHabits ? habits : habits.slice(0, 5)

  const sortedMessages = [...messages].sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  )
  const visibleMessages = sortedMessages.slice(0, msgPage * MSG_PAGE_SIZE)

  const groupedByDate = visibleMessages.reduce<Record<string, Message[]>>((acc, m) => {
    const date = m.created_at?.split('T')[0] || 'unknown'
    if (!acc[date]) acc[date] = []
    acc[date].push(m)
    return acc
  }, {})

  const sortedDates = Object.keys(groupedByDate).sort().reverse()

  return (
    <div>
      <h1 className="text-xl font-bold mb-6">Manage Users</h1>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Cari nomor WA..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-14 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : !data || data.users.length === 0 ? (
        <div className="text-center py-16">
          <UsersIcon className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">Tidak ada user</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-left py-3 px-3 font-medium">Nama / Email</th>
                  <th className="text-left py-3 px-3 font-medium">WA</th>
                  <th className="text-left py-3 px-3 font-medium">Plan</th>
                  <th className="text-left py-3 px-3 font-medium">Status</th>
                  <th className="text-center py-3 px-3 font-medium">Habit</th>
                  <th className="text-left py-3 px-3 font-medium">Bergabung</th>
                  <th className="text-right py-3 px-3 font-medium">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-muted/30">
                    <td className="py-3 px-3">
                      <p className="font-medium text-xs">{user.email || '-'}</p>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs">{user.wa_number || '-'}</span>
                      {user.wa_verified && <span className="text-[10px] text-green-600 ml-1">✓</span>}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`text-xs font-medium ${user.subscription?.plan === 'pro' ? 'text-amber-600' : ''}`}>
                        {user.subscription?.plan || 'free'}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="text-xs">{user.subscription?.status || '-'}</span>
                    </td>
                    <td className="py-3 px-3 text-center text-xs">{user.habit_count}</td>
                    <td className="py-3 px-3 text-xs">{user.created_at?.split('T')[0]}</td>
                    <td className="py-3 px-3 text-right">
                      <Button size="sm" variant="outline" className="text-xs h-7" onClick={() => openUser(user)}>
                        Kelola
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              Total {data.total} user
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 hover:bg-muted"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs text-muted-foreground">{page} / {totalPages}</span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30 hover:bg-muted"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </>
      )}

      <Dialog open={showUserDialog} onOpenChange={(o) => !o && setShowUserDialog(false)}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Kelola User</DialogTitle>
            <DialogDescription>
              {selectedUser?.email || selectedUser?.wa_number || '-'}
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4 py-2">
              {/* User Info + Actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm bg-muted/30 rounded-xl p-4">
                <div>
                  <p className="text-xs text-muted-foreground">WA</p>
                  <p className="font-medium">{selectedUser.wa_number || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Terverifikasi</p>
                  <p className="font-medium">{selectedUser.wa_verified ? 'Ya' : 'Tidak'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Role</p>
                  <p className="font-medium">{selectedUser.role}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Habit</p>
                  <p className="font-medium">{selectedUser.habit_count}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm bg-muted/30 rounded-xl p-4">
                <div>
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="font-medium">{selectedUser.subscription?.plan || 'free'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedUser.subscription?.status || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Period End</p>
                  <p className="font-medium">
                    {selectedUser.subscription?.current_period_end
                      ? new Date(selectedUser.subscription.current_period_end).toLocaleDateString()
                      : '-'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">Perpanjang</Label>
                  <select
                    value={extendDays}
                    onChange={(e) => setExtendDays(Number(e.target.value))}
                    className="h-8 rounded-lg border bg-transparent px-2 text-sm"
                  >
                    <option value={7}>+7 hari</option>
                    <option value={30}>+30 hari</option>
                  </select>
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={handleExtend} disabled={saving}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Perpanjang'}
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-xs shrink-0">Plan</Label>
                  <select
                    value={newPlan}
                    onChange={(e) => setNewPlan(e.target.value)}
                    className="h-8 rounded-lg border bg-transparent px-2 text-sm"
                  >
                    <option value="free">Free</option>
                    <option value="pro">Pro</option>
                  </select>
                  <Button size="sm" variant="outline" className="text-xs h-8" onClick={() => handlePlanChange(newPlan)} disabled={saving}>
                    Simpan
                  </Button>
                </div>

                <Button size="sm" variant="outline" className="text-xs" onClick={handleToggleOptOut}>
                  {selectedUser.opted_out ? 'Aktifkan Reminder' : 'Nonaktifkan Reminder'}
                </Button>
                <Button size="sm" variant="destructive" className="text-xs" onClick={handleDeactivate} disabled={saving}>
                  Nonaktifkan User
                </Button>
              </div>

              {/* Tabs: Habits & Chats */}
              <div className="border-t pt-4">
                <div className="flex gap-1 rounded-xl bg-muted p-1 mb-4">
                  <button
                    onClick={() => setActiveTab('habits')}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      activeTab === 'habits'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Riwayat Habit
                  </button>
                  <button
                    onClick={() => setActiveTab('chats')}
                    className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
                      activeTab === 'chats'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Riwayat Chat
                  </button>
                </div>

                {/* Habits Tab */}
                {activeTab === 'habits' && (
                  <div className="space-y-2">
                    {habitsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : habits.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Tidak ada habit</p>
                    ) : (
                      <>
                        {visibleHabits.map((h) => (
                          <div
                            key={h.id}
                            className="rounded-xl border p-3 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 min-w-0">
                                <div
                                  className="w-2.5 h-2.5 rounded-full shrink-0"
                                  style={{ backgroundColor: h.color }}
                                />
                                <span className="text-sm font-medium truncate">{h.name}</span>
                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                                  h.is_active
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {h.is_active ? 'Aktif' : 'Nonaktif'}
                                </span>
                              </div>
                              <span className="text-[10px] text-muted-foreground shrink-0">
                                {formatDate(h.created_at)}
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                              {h.schedule && (
                                <>
                                  <span key="time" className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {h.schedule.send_time.slice(0, 5)}
                                  </span>
                                  <span key="days" className="flex items-center gap-0.5">
                                    {h.schedule.days_of_week.map((d) => (
                                      <span key={d} className="text-[10px]">{dayLabel(d)}</span>
                                    ))}
                                  </span>
                                </>
                              )}
                              <span>{h.frequency}</span>
                              <span className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                {h.checkins.done}/{h.checkins.total}
                              </span>
                            </div>

                            {h.description && (
                              <p className="text-xs text-muted-foreground">{h.description}</p>
                            )}
                          </div>
                        ))}

                        {habits.length > 5 && (
                          <button
                            onClick={() => setShowAllHabits(!showAllHabits)}
                            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showAllHabits ? (
                              <>Lihat lebih sedikit <ChevronUp className="w-3 h-3" /></>
                            ) : (
                              <>Tampilkan {habits.length - 5} habit lagi <ChevronDown className="w-3 h-3" /></>
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Chats Tab */}
                {activeTab === 'chats' && (
                  <div className="space-y-4">
                    {chatsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : messages.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Tidak ada riwayat chat</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-center gap-2">
                          <p className="text-xs text-muted-foreground">
                            Menampilkan {visibleMessages.length} dari {messages.length} pesan
                          </p>
                          <button
                            onClick={exportChatTxt}
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Download className="w-3 h-3" />
                            Download
                          </button>
                        </div>

                        <div className="space-y-6">
                          {sortedDates.map((date) => (
                            <div key={date}>
                              <div className="flex items-center gap-2 mb-3">
                                <div className="h-px flex-1 bg-border/50" />
                                <span className="text-[10px] text-muted-foreground font-medium">
                                  {formatDate(date)}
                                </span>
                                <div className="h-px flex-1 bg-border/50" />
                              </div>

                              <div className="space-y-2">
                                {groupedByDate[date].map((msg, mi) => (
                                  <div
                                    key={msg.uuid || msg.id || `msg-${date}-${mi}`}
                                    className={`flex gap-2 ${msg.role === 'user' ? '' : 'flex-row-reverse'}`}
                                  >
                                    <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                                      msg.role === 'user'
                                        ? 'bg-primary/10 text-primary'
                                        : 'bg-green-100 text-green-600'
                                    }`}>
                                      {msg.role === 'user' ? (
                                        <User className="w-3.5 h-3.5" />
                                      ) : (
                                        <Bot className="w-3.5 h-3.5" />
                                      )}
                                    </div>
                                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                                      msg.role === 'user'
                                        ? 'bg-primary/10 rounded-tr-sm'
                                        : 'bg-muted rounded-tl-sm'
                                    }`}>
                                      <p className="text-xs leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                      <p className="text-[10px] text-muted-foreground mt-1 text-right">
                                        {msg.created_at ? formatTimeChat(msg.created_at) : ''}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {visibleMessages.length < messages.length && (
                          <button
                            onClick={() => setMsgPage((p) => p + 1)}
                            className="w-full flex items-center justify-center gap-1 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            Tampilkan {Math.min(MSG_PAGE_SIZE, messages.length - visibleMessages.length)} pesan lagi
                            <ChevronDown className="w-3 h-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUserDialog(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
