function parseHex(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function toHex(r: number, g: number, b: number) {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${[r, g, b].map((v) => clamp(v).toString(16).padStart(2, '0')).join('')}`
}

function lighten(hex: string, amount: number) {
  const { r, g, b } = parseHex(hex)
  return toHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount)
}

function darken(hex: string, amount: number) {
  const { r, g, b } = parseHex(hex)
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount))
}

export type CardSize = 'square' | 'portrait'

type Params = {
  habitName: string
  streak: number
  color: string
  heatmapData: boolean[]
  userName: string
  size: CardSize
}

const W = 1080
const H_SQUARE = 1080
const H_PORTRAIT = 1920

function isoDayStr(d: Date): number {
  const day = d.getDay()
  return day === 0 ? 6 : day - 1
}

function formatDateLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function getLast28Days(): { date: string; dow: number }[] {
  const days: { date: string; dow: number }[] = []
  for (let i = 27; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push({ date: formatDateLocal(d), dow: isoDayStr(d) })
  }
  return days
}

function heatmapLayout(days: { date: string; dow: number }[], doneSet: Set<string>) {
  const grid: (boolean | null)[][] = []
  let week: (boolean | null)[] = []

  for (const day of days) {
    while (week.length < day.dow) {
      week.push(null)
    }
    week.push(doneSet.has(day.date))
    if (week.length === 7) {
      grid.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    grid.push(week)
  }
  return grid
}

export async function generateStreakCard({
  habitName,
  streak,
  color,
  heatmapData,
  userName,
  size,
}: Params): Promise<Blob> {
  const H = size === 'square' ? H_SQUARE : H_PORTRAIT

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!

  const bgLight = lighten(color, 0.75)
  const accent = color

  const grad = ctx.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, bgLight)
  grad.addColorStop(0.6, '#ffffff')
  grad.addColorStop(1, '#fafafa')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  const isPortrait = size === 'portrait'

  const last28 = getLast28Days()
  const doneDates: string[] = []
  for (let i = 0; i < Math.min(heatmapData.length, 28); i++) {
    if (heatmapData[i]) {
      doneDates.push(last28[i].date)
    }
  }
  const doneSet = new Set(doneDates)
  const grid = heatmapLayout(last28, doneSet)

  const cellSize = 52
  const gap = 8
  const heatmapW = 7 * cellSize + 6 * gap
  const heatmapX = (W - heatmapW) / 2
  let heatmapY: number

  if (isPortrait) {
    heatmapY = 880
  } else {
    heatmapY = 660
  }

  const dayLabels = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']
  ctx.font = '18px "Plus Jakarta Sans", "Segoe UI", sans-serif'
  ctx.fillStyle = '#9ca3af'
  ctx.textAlign = 'center'
  const labelGap = 22
  for (let c = 0; c < 7; c++) {
    ctx.fillText(dayLabels[c], heatmapX + c * (cellSize + gap) + cellSize / 2, heatmapY - labelGap)
  }

  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < 7; c++) {
      const val = grid[r][c]
      const x = heatmapX + c * (cellSize + gap)
      const y = heatmapY + r * (cellSize + gap) + 10

      if (val === null) continue

      ctx.beginPath()
      ctx.roundRect(x, y, cellSize, cellSize, 6)
      if (val) {
        ctx.fillStyle = accent
        ctx.globalAlpha = 0.7
      } else {
        ctx.fillStyle = '#e5e7eb'
        ctx.globalAlpha = 1
      }
      ctx.fill()
      ctx.globalAlpha = 1
    }
  }

  const textColor = darken(color, 0.7)
  const mutedColor = '#6b7280'

  ctx.textAlign = 'center'

  const streakStr = String(streak)
  const fireSize = isPortrait ? 200 : 160
  const streakSize = isPortrait ? 340 : 260

  ctx.font = `${fireSize}px sans-serif`
  const fireY = isPortrait ? 320 : 240
  ctx.fillText('🔥', W / 2, fireY)

  ctx.font = `800 ${streakSize}px "Plus Jakarta Sans", "Inter", sans-serif`
  ctx.fillStyle = textColor
  const streakY = isPortrait ? 560 : 420
  ctx.fillText(streakStr, W / 2, streakY)

  ctx.font = `600 ${isPortrait ? 52 : 40}px "Plus Jakarta Sans", "Inter", sans-serif`
  ctx.fillStyle = mutedColor
  const subtitleY = isPortrait ? 640 : 500
  ctx.fillText('hari berturut-turut', W / 2, subtitleY)

  ctx.font = `700 ${isPortrait ? 56 : 44}px "Plus Jakarta Sans", "Inter", sans-serif`
  ctx.fillStyle = textColor
  const nameY = isPortrait ? 750 : 580
  ctx.fillText(habitName, W / 2, nameY)

  ctx.font = `500 ${isPortrait ? 36 : 28}px "Plus Jakarta Sans", "Inter", sans-serif`
  ctx.fillStyle = mutedColor
  const userY = isPortrait ? 1750 : 940
  ctx.fillText(userName, W / 2, userY)

  ctx.font = `500 ${isPortrait ? 28 : 22}px "Plus Jakarta Sans", "Inter", sans-serif`
  ctx.fillStyle = '#d1d5db'
  const footerY = isPortrait ? 1840 : 1000
  ctx.fillText('Nashifa Habit', W / 2, footerY)

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('Failed to generate PNG'))
    }, 'image/png')
  })
}
