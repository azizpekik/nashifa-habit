'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import BottomNav from '@/components/bottom-nav'
import HabitSheet from '@/components/habit-sheet'
import { Bell, BellOff, LogOut, Leaf, Smartphone, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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

type Profile = {
  email: string
  wa_number: string | null
  wa_verified: boolean
  opted_out: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [optedOut, setOptedOut] = useState(false)
  const [loading, setLoading] = useState(true)
  const [togglingReminder, setTogglingReminder] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showCreateSheet, setShowCreateSheet] = useState(false)

  const [showWaDialog, setShowWaDialog] = useState(false)
  const [waStep, setWaStep] = useState<'phone' | 'otp' | 'success'>('phone')
  const [waNumber, setWaNumber] = useState('')
  const [waOtp, setWaOtp] = useState('')
  const [waLoading, setWaLoading] = useState(false)
  const [waError, setWaError] = useState('')

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
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  function openWaDialog() {
    setWaNumber('')
    setWaOtp('')
    setWaError('')
    setWaStep('phone')
    setShowWaDialog(true)
  }

  async function handleSendOtp() {
    setWaLoading(true)
    setWaError('')
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wa_number: waNumber }),
    })
    const data = await res.json()
    if (!res.ok) {
      setWaError(data.error || 'Gagal mengirim OTP')
      setWaLoading(false)
      return
    }
    setWaStep('otp')
    setWaLoading(false)
  }

  async function handleVerifyOtp() {
    setWaLoading(true)
    setWaError('')
    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp: waOtp }),
    })
    const data = await res.json()
    if (!res.ok) {
      setWaError(
        data.error === 'expired'
          ? 'Kode OTP sudah kedaluwarsa. Kirim ulang.'
          : 'Kode OTP salah'
      )
      setWaLoading(false)
      return
    }
    setWaStep('success')
    setWaLoading(false)
    toast.success('Nomor WhatsApp berhasil diverifikasi!')
    load()
  }

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
                    <span className="flex items-center gap-1 text-[11px] font-medium text-green-600">
                      <CheckCircle2 className="w-3 h-3" />
                      Terverifikasi
                    </span>
                  ) : (
                    <button
                      onClick={openWaDialog}
                      className="text-[11px] font-medium text-primary hover:underline"
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
              </div>
            </div>
          </section>

          {/* About */}
          <section>
            <h2 className="text-[11px] font-medium text-muted-foreground mb-2.5 uppercase tracking-wider">Tentang</h2>
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

      <BottomNav onAddClick={() => setShowCreateSheet(true)} />
      </div>

      <HabitSheet
        open={showCreateSheet}
        onOpenChange={setShowCreateSheet}
        onSuccess={() => router.push('/dashboard')}
      />

      <Dialog open={showWaDialog} onOpenChange={setShowWaDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {waStep === 'phone' && 'Verifikasi WhatsApp'}
              {waStep === 'otp' && 'Masukkan Kode OTP'}
              {waStep === 'success' && 'Berhasil Terverifikasi'}
            </DialogTitle>
          </DialogHeader>

          {waStep === 'phone' && (
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3 rounded-xl bg-muted/50 p-3">
                <Smartphone className="w-5 h-5 text-primary shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Masukkan nomor WhatsApp kamu untuk menerima reminder habit otomatis.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wa-number">Nomor WhatsApp</Label>
                <Input
                  id="wa-number"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                />
              </div>
              {waError && <p className="text-sm text-destructive">{waError}</p>}
              <Button className="w-full" onClick={handleSendOtp} disabled={waLoading || !waNumber.trim()}>
                {waLoading ? 'Mengirim...' : 'Kirim OTP'}
              </Button>
            </div>
          )}

          {waStep === 'otp' && (
            <div className="space-y-4 py-2">
              <p className="text-xs text-muted-foreground">
                Kode OTP telah dikirim ke <span className="font-medium text-foreground">{waNumber}</span>
              </p>
              <div className="space-y-2">
                <Label htmlFor="wa-otp">Kode OTP</Label>
                <Input
                  id="wa-otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={waOtp}
                  onChange={(e) => setWaOtp(e.target.value.replace(/\D/g, ''))}
                />
              </div>
              {waError && <p className="text-sm text-destructive">{waError}</p>}
              <Button className="w-full" onClick={handleVerifyOtp} disabled={waLoading || waOtp.length < 6}>
                {waLoading ? 'Memverifikasi...' : 'Verifikasi'}
              </Button>
              <button
                type="button"
                onClick={() => { setWaStep('phone'); setWaError('') }}
                className="w-full text-xs text-muted-foreground hover:text-foreground text-center"
              >
                Ganti nomor
              </button>
            </div>
          )}

          {waStep === 'success' && (
            <div className="py-6 text-center space-y-3">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <p className="font-semibold text-lg">Siap!</p>
              <p className="text-sm text-muted-foreground">
                Kamu akan menerima reminder habit via WhatsApp.
              </p>
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
