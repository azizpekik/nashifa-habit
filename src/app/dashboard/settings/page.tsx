'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Bell, BellOff, LogOut, Leaf, CheckCircle2, MessageCircle, RotateCcw, Trash2, Flame, HelpCircle, ExternalLink, RefreshCw, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { computeStreaks } from '@/lib/streaks'
import type { StreakResult, Checkin } from '@/lib/streaks'

type Profile = {
  email: string
  wa_number: string | null
  wa_verified: boolean
  opted_out: boolean
}

type ArchivedHabit = {
  id: string
  name: string
  description: string | null
  color: string
  created_at: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [optedOut, setOptedOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [togglingReminder, setTogglingReminder] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showWaDialog, setShowWaDialog] = useState(false)
  const [verifyCode, setVerifyCode] = useState('')
  const [verified, setVerified] = useState(false)
  const [verifiedNumber, setVerifiedNumber] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [waError, setWaError] = useState('')
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [archived, setArchived] = useState<ArchivedHabit[]>([])
  const [deleteTarget, setDeleteTarget] = useState<ArchivedHabit | null>(null)
  const [deletingArchive, setDeletingArchive] = useState(false)
  const [reactivating, setReactivating] = useState<string | null>(null)
  const [streakTarget, setStreakTarget] = useState<ArchivedHabit | null>(null)
  const [streakData, setStreakData] = useState<StreakResult | null>(null)
  const [streakLoading, setStreakLoading] = useState(false)
  const [showGuide, setShowGuide] = useState(false)

  async function load() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: prof } = await supabase
      .from('profiles')
      .select('wa_number, wa_verified, opted_out')
      .eq('id', user.id)
      .single()

    setProfile({
      email: user.email || '',
      wa_number: prof?.wa_number || null,
      wa_verified: prof?.wa_verified || false,
      opted_out: prof?.opted_out || false,
    })
    setOptedOut(prof?.opted_out || false)

    const { data: archivedHabits } = await supabase
      .from('habits')
      .select('id, name, description, color, created_at')
      .eq('user_id', user.id)
      .eq('is_active', false)
      .order('updated_at', { ascending: false })

    setArchived(archivedHabits || [])

    setLoading(false)
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function openWaDialog() {
    setVerifyCode('')
    setVerified(false)
    setVerifiedNumber('')
    setWaError('')
    setShowWaDialog(true)
  }

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }, [])

  async function startVerify() {
    setVerifying(true)
    setWaError('')
    setVerified(false)
    setVerifiedNumber('')

    const res = await fetch('/api/wa/start-verify', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setWaError(data.error || 'Gagal memulai verifikasi')
      setVerifying(false)
      return
    }
    setVerifyCode(data.code)
    setVerifying(false)
  }

  useEffect(() => {
    if (!showWaDialog) {
      stopPolling()
      return
    }
    startVerify()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWaDialog])

  useEffect(() => {
    if (!showWaDialog || !verifyCode || verified) return

    pollingRef.current = setInterval(async () => {
      const res = await fetch('/api/wa/verify-status')
      const data = await res.json()
      if (data.verified) {
        stopPolling()
        setVerified(true)
        setVerifiedNumber(data.wa_number || '')
        toast.success('Nomor WhatsApp berhasil diverifikasi!')
      }
    }, 3000)

    return () => stopPolling()
  }, [showWaDialog, verifyCode, verified, stopPolling])

  useEffect(() => {
    if (!verified) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verified])

  function handleToggleClick() {
    if (optedOut) {
      confirmToggle()
    } else {
      setShowConfirm(true)
    }
  }

  async function confirmToggle() {
    setShowConfirm(false)
    setTogglingReminder(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('profiles').update({ opted_out: !optedOut }).eq('id', user.id)
    setOptedOut(!optedOut)
    setTogglingReminder(false)
    toast.success(optedOut ? 'Reminder diaktifkan' : 'Reminder dinonaktifkan')
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  async function handleReactivate(habitId: string) {
    setReactivating(habitId)
    const supabase = createClient()
    await supabase.from('habits').update({ is_active: true }).eq('id', habitId)
    toast.success('Habit diaktifkan kembali')
    load()
    setReactivating(null)
  }

  async function handlePermanentDelete(habit: ArchivedHabit) {
    setDeletingArchive(true)
    const supabase = createClient()
    await supabase.from('checkins').delete().eq('habit_id', habit.id)
    await supabase.from('schedules').delete().eq('habit_id', habit.id)
    await supabase.from('habits').delete().eq('id', habit.id)
    setDeletingArchive(false)
    setDeleteTarget(null)
    toast.success(`${habit.name} dihapus permanen`)
    setArchived((prev) => prev.filter((h) => h.id !== habit.id))
  }

  async function handleViewStreak(habit: ArchivedHabit) {
    setStreakTarget(habit)
    setStreakLoading(true)
    setStreakData(null)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [checkinsRes, scheduleRes, profileRes] = await Promise.all([
      supabase.from('checkins').select('checkin_date, status').eq('habit_id', habit.id).eq('user_id', user.id),
      supabase.from('schedules').select('days_of_week').eq('habit_id', habit.id).single(),
      supabase.from('profiles').select('timezone').eq('id', user.id).single(),
    ])

    const checkins = (checkinsRes.data || []) as Checkin[]
    const daysOfWeek = (scheduleRes.data as { days_of_week: number[] } | null)?.days_of_week || [1,2,3,4,5,6,7]
    const tz = (profileRes.data as { timezone: string } | null)?.timezone || 'Asia/Jakarta'

    const result = computeStreaks(checkins, daysOfWeek, tz, habit.created_at?.split('T')[0])
    setStreakData(result)
    setStreakLoading(false)
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-lg px-5 pt-12 pb-28">
        <div className="h-5 w-24 bg-muted rounded animate-pulse mb-2" />
        <div className="h-8 w-28 bg-muted rounded animate-pulse mb-8" />
        <div className="space-y-6">
          <div className="h-32 bg-muted rounded-2xl animate-pulse" />
          <div className="h-20 bg-muted rounded-2xl animate-pulse" />
          <div className="h-20 bg-muted rounded-2xl animate-pulse" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="min-h-screen pb-28">
        <div className="mx-auto w-full max-w-lg px-5 pt-12">
          <div>
            <p className="text-[13px] text-muted-foreground font-medium">Preferences</p>
            <h1 className="text-2xl font-semibold mt-0.5 tracking-tight">Pengaturan</h1>
          </div>

          <div className="mt-8 space-y-6">
            {/* Account */}
            <section>
              <h2 className="text-[11px] font-medium text-muted-foreground mb-2.5 uppercase tracking-wider">Akun</h2>
              <div className="rounded-2xl bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] overflow-hidden">
                {profile && (
                  <div className="px-5 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{profile.email}</p>
                        <p className="text-[12px] text-muted-foreground">Tersinkronisasi</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-muted text-sm text-muted-foreground hover:text-foreground transition-colors active:scale-95"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Keluar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* WhatsApp */}
            <section>
              <h2 className="text-[11px] font-medium text-muted-foreground mb-2.5 uppercase tracking-wider">WhatsApp</h2>
              <div className="rounded-2xl bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] overflow-hidden">
                <div className="divide-y divide-border/50">
                  <div className="flex items-center gap-3 px-5 py-4">
                    <div className="w-4 h-4 text-muted-foreground flex-shrink-0 flex items-center justify-center">
                      <span className="text-xs">📱</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Nomor WhatsApp</p>
                      <p className="text-[12px] text-muted-foreground">
                        {profile?.wa_number || '-'}
                      </p>
                    </div>
                    {profile?.wa_verified ? (
                      <button
                        onClick={openWaDialog}
                        className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-[11px] font-semibold text-green-700 shadow-sm transition-all active:scale-95 hover:bg-green-100 dark:border-green-800 dark:bg-green-950/30 dark:text-green-400 dark:hover:bg-green-950/50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ganti nomor
                      </button>
                    ) : (
                      <button
                        onClick={openWaDialog}
                        className="rounded-full bg-primary px-3.5 py-1.5 text-[11px] font-semibold text-primary-foreground shadow-sm transition-all active:scale-95 hover:brightness-110"
                      >
                        Verifikasi
                      </button>
                    )}
                  </div>

                  <button
                    onClick={handleToggleClick}
                    disabled={togglingReminder}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors active:scale-[0.99]"
                  >
                    {optedOut ? (
                      <BellOff className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Bell className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        {optedOut ? 'Reminder nonaktif' : 'Reminder aktif'}
                      </p>
                      <p className="text-[12px] text-muted-foreground">
                        {optedOut
                          ? 'Klik untuk mengaktifkan kembali'
                          : 'Pengingat WhatsApp untuk habit harian'
                        }
                      </p>
                    </div>
                    <div
                      className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${
                        optedOut ? 'bg-muted' : 'bg-primary'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          optedOut ? 'translate-x-0' : 'translate-x-4'
                        }`}
                      />
                    </div>
                  </button>

                  <a
                    href="https://wa.me/6287767981589?text=halo%20nashifa%2C%20tolong%20cek%20habit%20aku%20dong"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 transition-colors active:scale-[0.99]"
                  >
                    <MessageCircle className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">Konsultasi Habit 24/7</p>
                      <p className="text-[12px] text-muted-foreground">
                        Chat langsung dengan Kak Nashifa
                      </p>
                    </div>
                    <span className="text-[11px] font-medium text-green-600 shrink-0">Chat</span>
                  </a>
                </div>
              </div>
            </section>

            {/* Arsip */}
            <section>
              <h2 className="text-[11px] font-medium text-muted-foreground mb-2.5 uppercase tracking-wider">Arsip</h2>
              <div className="rounded-2xl bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] overflow-hidden">
                {archived.length === 0 ? (
                  <div className="px-5 py-4 text-sm text-muted-foreground">
                    <p>Tidak ada habit yang diarsipkan</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/50">
                    {archived.map((habit) => (
                      <div key={habit.id} className="flex items-center gap-3 px-5 py-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: habit.color || '#22c55e' }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{habit.name}</p>
                          {habit.description && (
                            <p className="text-[12px] text-muted-foreground truncate">{habit.description}</p>
                          )}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleViewStreak(habit)}
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-muted-foreground hover:text-orange-500 hover:bg-orange-500/10 transition-colors"
                            title="Lihat streak"
                          >
                            <Flame className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReactivate(habit.id)}
                            disabled={reactivating === habit.id}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                          >
                            <RotateCcw className={`w-3 h-3 ${reactivating === habit.id ? 'animate-spin' : ''}`} />
                            Aktifkan
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(habit)}
                            className="flex items-center justify-center w-7 h-7 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                            title="Hapus permanen"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* About */}
            <section>
              <h2 className="text-[11px] font-medium text-muted-foreground mb-2.5 uppercase tracking-wider">Tentang</h2>
              <button
                type="button"
                onClick={() => setShowGuide(true)}
                className="w-full text-left rounded-2xl bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] px-5 py-4 transition-all active:scale-[0.98] mb-3 hover:shadow-md"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <HelpCircle className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Panduan Aplikasi</p>
                    <p className="text-[12px] text-muted-foreground">Cara pakai, fitur, dan tips</p>
                  </div>
                </div>
              </button>
              <div className="rounded-2xl bg-card shadow-[0_1px_4px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.03)] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Nashifa Habit</p>
                    <p className="text-[12px] text-muted-foreground">Version 1.0.0</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus permanen?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{deleteTarget?.name}</strong> dan seluruh riwayat check-in-nya akan dihapus permanen. Tindakan ini tidak bisa dibatalkan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteTarget && handlePermanentDelete(deleteTarget)} disabled={deletingArchive}>
                {deletingArchive ? 'Menghapus...' : 'Ya, hapus permanen'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Nonaktifkan Semua Reminder?</AlertDialogTitle>
              <AlertDialogDescription>
                Kamu tidak akan menerima pengingat WhatsApp untuk habit apapun sampai diaktifkan kembali.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={confirmToggle}>
                Ya, Nonaktifkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={!!streakTarget} onOpenChange={(o) => { if (!o) { setStreakTarget(null); setStreakData(null) } }}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-500" />
                {streakTarget?.name}
              </DialogTitle>
            </DialogHeader>
            {streakLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : streakData ? (
              <div className="py-2 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-orange-50 dark:bg-orange-950/20 p-4 text-center">
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{streakData.current}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Streak saat ini</p>
                  </div>
                  <div className="rounded-xl bg-primary/5 p-4 text-center">
                    <p className="text-3xl font-bold text-primary">{streakData.longest}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Streak terpanjang</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-muted p-4 text-center">
                    <p className="text-3xl font-bold">{streakData.consistency30}%</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Konsistensi 30 hari</p>
                  </div>
                  <div className="rounded-xl bg-muted p-4 text-center">
                    <p className="text-3xl font-bold">{streakData.totalCheckins}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">Total check-in</p>
                  </div>
                </div>
              </div>
            ) : null}
          </DialogContent>
        </Dialog>

        <Dialog open={showGuide} onOpenChange={setShowGuide}>
          <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg">
                <HelpCircle className="w-5 h-5 text-primary" />
                Panduan Aplikasi
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-2 text-sm leading-relaxed">
              <div>
                <h3 className="font-semibold text-base mb-1">Apa itu Nashifa Habit?</h3>
                <p className="text-muted-foreground">
                  Nashifa Habit adalah aplikasi pembangun kebiasaan (habit tracker) yang membantu kamu konsisten menjalankan rutinitas harian. Catat progres, pantau streak, dan dapatkan pengingat otomatis via WhatsApp.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-1">Cara Pakai</h3>
                <ol className="list-decimal list-inside space-y-1.5 text-muted-foreground">
                  <li>Buat habit baru dari halaman utama dengan menekan tombol <strong>+</strong></li>
                  <li>Atur jadwal — pilih jam reminder dan hari-hari dalam seminggu</li>
                  <li>Check-in setiap hari dengan menekan lingkaran habit di dashboard</li>
                  <li>Jaga streak-mu tetap menyala! Streak akan terputus jika kamu melewatkan satu hari yang dijadwalkan</li>
                  <li>Gunakan template habit untuk memulai paket kebiasaan siap pakai</li>
                </ol>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-1">Fitur Unggulan</h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-primary shrink-0 mt-0.5">•</span>
                    <span><strong>Streak Tracker</strong> — Pantau konsistensi dengan streak saat ini, terpanjang, dan grafik 30 hari</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary shrink-0 mt-0.5">•</span>
                    <span><strong>Template Habit</strong> — Terapkan paket habit dari Kak Nashifa dengan sekali klik</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary shrink-0 mt-0.5">•</span>
                    <span><strong>WhatsApp Reminder</strong> — Dapatkan pengingat otomatis via WhatsApp setiap jadwal tiba</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary shrink-0 mt-0.5">•</span>
                    <span><strong>Laporan & Bagikan</strong> — Lihat statistik habit dan bagikan streak sebagai gambar</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary shrink-0 mt-0.5">•</span>
                    <span><strong>Arsip</strong> — Arsipkan habit yang sudah tidak aktif tanpa kehilangan riwayat</span>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-1">Tips</h3>
                <ul className="space-y-1.5 text-muted-foreground list-disc list-inside">
                  <li>Jangan buat terlalu banyak habit sekaligus — fokus pada 3-5 habit dulu</li>
                  <li>Akun kamu tetap <strong>login</strong> selama 30 hari terakhir, kamu harus login ulang setelah 30 hari tidak aktif atau ketika pindah perangkat</li>
                  <li>Jika ada kendala, chat Kak Nashifa lewat tombol Konsultasi 24/7 di halaman ini</li>
                </ul>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      </div>

      <Dialog open={showWaDialog} onOpenChange={setShowWaDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {verified ? 'Berhasil Terverifikasi' : 'Verifikasi WhatsApp'}
            </DialogTitle>
          </DialogHeader>

          {waError && !verifyCode && !verified && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-destructive text-center">{waError}</p>
              <Button className="w-full" onClick={startVerify} disabled={verifying}>
                {verifying ? 'Memuat...' : 'Coba Lagi'}
              </Button>
            </div>
          )}

          {verifying && !verifyCode && (
            <div className="py-8 flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Menyiapkan kode verifikasi...</p>
            </div>
          )}

          {verifyCode && !verified && (
            <div className="flex flex-col items-center gap-6 py-4">
              <div className="rounded-2xl bg-muted px-8 py-6 w-full">
                <p className="text-center text-xs text-muted-foreground mb-2">Kode Verifikasi</p>
                <p className="text-center font-mono text-4xl font-bold tracking-[0.3em] text-foreground select-all">
                  {verifyCode}
                </p>
              </div>

              <a
                href={`https://wa.me/${process.env.NEXT_PUBLIC_WA_BOT_NUMBER}?text=${encodeURIComponent('DAFTAR ' + verifyCode)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full rounded-xl py-6 text-base font-semibold gap-2">
                  <ExternalLink className="w-5 h-5" />
                  Buka WhatsApp & Kirim Kode
                </Button>
              </a>

              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                Tekan tombol Kirim di WhatsApp tanpa mengubah pesan, lalu kembali ke sini.
              </p>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Menunggu pesan kamu...
              </div>

              <button
                type="button"
                onClick={startVerify}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Buat kode baru
              </button>
            </div>
          )}

          {verified && (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-semibold text-lg">Terhubung ✅</p>
              <p className="text-sm text-muted-foreground">{verifiedNumber}</p>
              <Button className="mt-2" onClick={() => setShowWaDialog(false)}>
                Tutup
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
