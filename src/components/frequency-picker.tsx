'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

type Props = {
  frequencyType: 'everyday' | 'pickdays'
  daysOfWeek: number[]
  onFrequencyChange: (type: 'everyday' | 'pickdays') => void
  onToggleDay: (day: number) => void
}

export default function FrequencyPicker({
  frequencyType,
  daysOfWeek,
  onFrequencyChange,
  onToggleDay,
}: Props) {
  return (
    <div className="space-y-3">
      <Label>Seberapa sering?</Label>
      <div className="flex gap-2">
        <Button
          type="button"
          variant={frequencyType === 'everyday' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => onFrequencyChange('everyday')}
        >
          Setiap hari
        </Button>
        <Button
          type="button"
          variant={frequencyType === 'pickdays' ? 'default' : 'outline'}
          className="flex-1"
          onClick={() => onFrequencyChange('pickdays')}
        >
          Pilih hari tertentu
        </Button>
      </div>
      {frequencyType === 'pickdays' && (
        <div className="space-y-2">
          <Label>Hari Aktif</Label>
          <div className="flex flex-wrap gap-2">
            {DAYS.map((day, i) => {
              const dayNum = i + 1
              return (
                <Badge
                  key={day}
                  variant={daysOfWeek.includes(dayNum) ? 'default' : 'outline'}
                  className="cursor-pointer select-none px-3 py-1.5 text-sm"
                  onClick={() => onToggleDay(dayNum)}
                >
                  {day}
                </Badge>
              )
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            Target: {daysOfWeek.length}/7 hari
          </p>
        </div>
      )}
      {frequencyType === 'everyday' && (
        <p className="text-sm text-muted-foreground">Target: 7/7 hari</p>
      )}
    </div>
  )
}
