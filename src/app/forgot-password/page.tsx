'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type Step = 'phone' | 'otp' | 'reset'

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>('phone')
  const [waNumber, setWaNumber] = useState('')
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/forgot-password/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wa_number: waNumber }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Gagal mengirim OTP')
      setLoading(false)
      return
    }

    setStep('otp')
    setLoading(false)
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/forgot-password/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wa_number: waNumber, otp }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(
        data.error === 'expired'
          ? 'Kode OTP sudah kedaluwarsa. Kirim ulang.'
          : 'Kode OTP salah'
      )
      setLoading(false)
      return
    }

    setResetToken(data.reset_token)
    setStep('reset')
    setLoading(false)
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (password !== confirmPassword) {
      setError('Password tidak cocok')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('Password minimal 6 karakter')
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/forgot-password/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        wa_number: waNumber,
        reset_token: resetToken,
        password,
      }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Gagal mengubah password')
      setLoading(false)
      return
    }

    router.push('/login')
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <Image
            src="/logo-nashifa.png"
            alt="Nashifa Habit"
            width={64}
            height={64}
            className="mx-auto mb-2"
          />
          <CardTitle>Lupa Password</CardTitle>
          <CardDescription>
            {step === 'phone' && 'Masukkan nomor WhatsApp terdaftar'}
            {step === 'otp' && 'Masukkan kode OTP dari WhatsApp'}
            {step === 'reset' && 'Buat password baru'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="wa_number">Nomor WhatsApp</Label>
                <Input
                  id="wa_number"
                  type="tel"
                  placeholder="08xxxxxxxxxx"
                  value={waNumber}
                  onChange={(e) => setWaNumber(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Mengirim...' : 'Kirim OTP'}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Kode OTP</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Memverifikasi...' : 'Verifikasi'}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full"
                onClick={() => {
                  setStep('phone')
                  setError('')
                  setOtp('')
                }}
              >
                Ganti nomor WhatsApp
              </Button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Password Baru</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Konfirmasi Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Ulangi password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Menyimpan...' : 'Ubah Password'}
              </Button>
            </form>
          )}

          <p className="mt-4 text-center text-sm text-muted-foreground">
            Ingat password?{' '}
            <Link href="/login" className="underline underline-offset-4 hover:text-primary">
              Masuk
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
