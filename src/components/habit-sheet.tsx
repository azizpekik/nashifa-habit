'use client'
/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Trash2, Loader2 } from 'lucide-react'
import ColorPicker from '@/components/color-picker'
import FrequencyPicker from '@/components/frequency-picker'

type Schedule = { id?: string; send_time: string; days_of_week: number[] }
type Habit = {
  id: string
  name: string
  description: string | null
  frequency: string
  color: string
  is_active: boolean
  schedules: Schedule[]
}

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  habit?: Habit
}

export default function HabitSheet({ open, onOpenChange, onSuccess, habit }: Props) {
  const isEdit = !!habit

  const [habitName, setHabitName] = useState('')
  const [habitDesc, setHabitDesc] = useState('')
  const [habitColor, setHabitColor] = useState('#22c55e')
  const [sendTime, setSendTime] = useState('07:00')
  const [frequencyType, setFrequencyType] = useState<'everyday' | 'pickdays'>('everyday')
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([1, 2, 3, 4, 5, 6, 7])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!open) return
    const existingDays = habit?.schedules?.[0]?.days_of_week
    const hasAllDays = existingDays?.length === 7
    setHabitName(habit?.name || '')
    setHabitDesc(habit?.description || '')
    setHabitColor(habit?.color || '#22c55e')
    setSendTime(habit?.schedules?.[0]?.send_time?.slice(0, 5) || '07:00')
    setFrequencyType(hasAllDays ? 'everyday' : 'pickdays')
    setDaysOfWeek(existingDays || [1, 2, 3, 4, 5, 6, 7])
    setLoading(false)
    setError('')
  }, [open, habit])

  function handleFrequencyChange(type: 'everyday' | 'pickdays') {
    if (type === 'everyday') {
      setDaysOfWeek([1, 2, 3, 4, 5, 6, 7])
    }
    setFrequencyType(type)
  }

  function toggleDay(day: number) {
    setDaysOfWeek((prev) =>
      prev.includes(day)
        ? prev.filter((d) => d !== day)
        : [...prev, day].sort((a, b) => a - b)
    )
  }

  async function handleSubmit() {
    if (!habitName.trim()) return
    if (frequencyType === 'pickdays' && daysOfWeek.length === 0) return
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Sesi habis, silakan login ulang')
      setLoading(false)
      return
    }

    const frequency = frequencyType === 'everyday' ? 'daily' : 'custom'
    const targetPerWeek = frequencyType === 'everyday' ? null : daysOfWeek.length
    const days = frequencyType === 'everyday' ? [1, 2, 3, 4, 5, 6, 7] : daysOfWeek

    if (isEdit && habit) {
      const { error: habitError } = await supabase
        .from('habits')
        .update({
          name: habitName.trim(),
          description: habitDesc || null,
          frequency,
          target_per_week: targetPerWeek,
          color: habitColor,
        })
        .eq('id', habit.id)

      if (habitError) {
        setError(habitError.message)
        setLoading(false)
        return
      }

      const schedId = habit.schedules?.[0]?.id
      if (schedId) {
        const { error: schedError } = await supabase
          .from('schedules')
          .update({ send_time: sendTime + ':00', days_of_week: days })
          .eq('id', schedId)

        if (schedError) {
          setError(schedError.message)
          setLoading(false)
          return
        }
      }
    } else {
      const { data: newHabit, error: habitError } = await supabase
        .from('habits')
        .insert({
          user_id: user.id,
          name: habitName.trim(),
          description: habitDesc || null,
          frequency,
          target_per_week: targetPerWeek,
          color: habitColor,
        })
        .select()
        .single()

      if (habitError) {
        setError(habitError.message)
        setLoading(false)
        return
      }

      const { error: schedError } = await supabase
        .from('schedules')
        .insert({
          habit_id: newHabit.id,
          user_id: user.id,
          send_time: sendTime + ':00',
          days_of_week: days,
        })

      if (schedError) {
        setError(schedError.message)
        setLoading(false)
        return
      }
    }

    setLoading(false)
    onOpenChange(false)
    toast.success(isEdit ? 'Habit berhasil diperbarui' : 'Habit berhasil dibuat')
    onSuccess()
  }

  async function handleDelete() {
    if (!habit) return
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('checkins').delete().eq('habit_id', habit.id)
    await supabase.from('schedules').delete().eq('habit_id', habit.id)
    await supabase.from('habits').delete().eq('id', habit.id)
    setDeleting(false)
    onOpenChange(false)
    toast.success('Habit berhasil dihapus')
    onSuccess()
  }

  const canSubmit =
    habitName.trim().length > 0 &&
    !(frequencyType === 'pickdays' && daysOfWeek.length === 0)

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent onOpenAutoFocus={(e) => e.preventDefault()}>
          <SheetHeader>
            <SheetTitle>{isEdit ? 'Edit Habit' : 'Tambah Habit'}</SheetTitle>
            <SheetDescription>
              {isEdit ? 'Ubah detail habit kamu' : 'Buat habit baru untuk dilacak'}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="hs-name">Nama Habit</Label>
              <Input
                id="hs-name"
                placeholder="Misal: Minum Air Putih"
                value={habitName}
                onChange={(e) => setHabitName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hs-desc">Deskripsi (opsional)</Label>
              <Input
                id="hs-desc"
                placeholder="Deskripsi habit"
                value={habitDesc}
                onChange={(e) => setHabitDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Warna Accent</Label>
              <ColorPicker value={habitColor} onChange={setHabitColor} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hs-time">Jam Reminder</Label>
              <Input
                id="hs-time"
                type="time"
                value={sendTime}
                onChange={(e) => setSendTime(e.target.value)}
              />
            </div>

            <FrequencyPicker
              frequencyType={frequencyType}
              daysOfWeek={daysOfWeek}
              onFrequencyChange={handleFrequencyChange}
              onToggleDay={toggleDay}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <SheetFooter className="flex-col gap-2 sm:flex-col">
            {isEdit && (
              <Button
                variant="destructive"
                className="w-full gap-2"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {deleting ? 'Menghapus...' : 'Hapus Habit'}
              </Button>
            )}
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Batal
              </Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={!canSubmit || loading}>
                {loading ? 'Menyimpan...' : 'Simpan'}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  )
}
