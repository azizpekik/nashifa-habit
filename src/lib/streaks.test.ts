import { describe, it, expect } from 'vitest'
import { computeStreaks, type Checkin } from './streaks'

const tz = 'Asia/Jakarta'

describe('computeStreaks', () => {
  it('streak berjalan — check-in setiap hari', () => {
    const dates = ['2026-07-08', '2026-07-07', '2026-07-06', '2026-07-05',
      '2026-07-04', '2026-07-03', '2026-07-02', '2026-07-01',
      '2026-06-30', '2026-06-29']
    const result = computeStreaks(
      dates.map((d) => ({ checkin_date: d, status: 'done' as const })),
      [1, 2, 3, 4, 5, 6, 7], tz, undefined, '2026-07-08'
    )
    expect(result.current).toBe(10)
    expect(result.longest).toBe(10)
  })

  it('hari ini belum check-in — streak belum putus (hitung dari kemarin)', () => {
    const dates = ['2026-07-07', '2026-07-06', '2026-07-05',
      '2026-07-04', '2026-07-03']
    const result = computeStreaks(
      dates.map((d) => ({ checkin_date: d, status: 'done' as const })),
      [1, 2, 3, 4, 5, 6, 7], tz, undefined, '2026-07-08'
    )
    expect(result.current).toBe(5)
    expect(result.longest).toBe(5)
  })

  it('jadwal Sen-Jum — streak tidak putus oleh Sab-Ming', () => {
    // Jumat(3) done, Senin(6) done — streak tersambung
    const dates = ['2026-07-06', '2026-07-03', '2026-07-02', '2026-07-01']
    const result = computeStreaks(
      dates.map((d) => ({ checkin_date: d, status: 'done' as const })),
      [1, 2, 3, 4, 5], tz, undefined, '2026-07-08'
    )
    // 4 hari done berurutan (1,2,3 Jul + 6 Jul) — 3->4->5->6 dilewati Sab-Ming
    expect(result.longest).toBeGreaterThanOrEqual(4)
    // Current streak: today Rab(8) belum done, kemarin Sel(7) belum done -> 0
  })

  it('habit baru dibuat kemarin — konsistensi 100%', () => {
    const result = computeStreaks(
      [{ checkin_date: '2026-07-07', status: 'done' }],
      [1, 2, 3, 4, 5, 6, 7], tz, '2026-07-07', '2026-07-08'
    )
    expect(result.consistency30).toBe(100)
  })

  it('partial tidak dihitung sebagai done', () => {
    const checkins: Checkin[] = [
      { checkin_date: '2026-07-08', status: 'partial' },
    ]
    const result = computeStreaks(checkins, [1, 2, 3, 4, 5, 6, 7], tz, undefined, '2026-07-08')
    expect(result.current).toBe(0)
  })

  it('tidak ada check-in — streak 0', () => {
    const result = computeStreaks([], [1, 2, 3, 4, 5, 6, 7], tz, undefined, '2026-07-08')
    expect(result.current).toBe(0)
    expect(result.longest).toBe(0)
    expect(result.consistency30).toBe(0)
  })

  it('longest streak lebih panjang dari current', () => {
    // Dulu streak 5 hari, sekarang cuma 2 hari
    const dates = ['2026-07-08', '2026-07-07', '2026-06-20', '2026-06-19',
      '2026-06-18', '2026-06-17', '2026-06-16']
    const result = computeStreaks(
      dates.map((d) => ({ checkin_date: d, status: 'done' as const })),
      [1, 2, 3, 4, 5, 6, 7], tz, undefined, '2026-07-08'
    )
    expect(result.current).toBe(2)
    expect(result.longest).toBe(5)
  })
})
