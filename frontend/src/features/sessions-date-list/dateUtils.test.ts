import { describe, expect, it } from 'vitest'

import { buildCalendarMatrix, toISODate } from './dateUtils'

describe('dateUtils', () => {
  describe('toISODate', () => {
    it('UTCベースでISO日付文字列を生成する', () => {
      const date = new Date(Date.UTC(2025, 2, 15, 23, 59, 59))

      expect(toISODate(date)).toBe('2025-03-15')
    })
  })

  describe('buildCalendarMatrix', () => {
    it('週開始を日曜日として3週分のマトリクスを生成する', () => {
      const base = new Date(Date.UTC(2025, 0, 15))

      const matrix = buildCalendarMatrix(base)

      expect(matrix).toHaveLength(3)
      matrix.forEach((week) => {
        expect(week).toHaveLength(7)
      })

      expect(matrix[0][0].dateIso).toBe('2025-01-12')
      expect(matrix[1][0].dateIso).toBe('2025-01-19')
      expect(matrix[2][0].dateIso).toBe('2025-01-26')
    })

    it('月またぎの境界で前月・翌月セルを含める', () => {
      const base = new Date(Date.UTC(2025, 3, 2))

      const matrix = buildCalendarMatrix(base)

      expect(matrix[0][0].isCurrentMonth).toBe(false)
      expect(matrix[0][0].dateIso).toBe('2025-03-30')
      expect(matrix[0][6].dateIso).toBe('2025-04-05')
      expect(matrix[2][6].isCurrentMonth).toBe(true)
      expect(matrix[2][6].dateIso).toBe('2025-04-19')
    })
  })
})
