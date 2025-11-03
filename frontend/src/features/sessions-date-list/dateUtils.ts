const MS_PER_DAY = 86_400_000
const DEFAULT_LOCALE = 'ja-JP'
const DEFAULT_TIME_ZONE = 'UTC'

type DateInput = Date | string

const toDateInstance = (value: DateInput): Date => {
  return value instanceof Date ? value : new Date(value)
}

export const parseISODate = (iso: string): Date => {
  const [ year, month, day ] = iso.split('-').map(Number)
  return new Date(Date.UTC(year, (month ?? 1) - 1, day ?? 1))
}

const startOfUTCDate = (value: Date): Date => {
  const utcYear = value.getUTCFullYear()
  const utcMonth = value.getUTCMonth()
  const utcDate = value.getUTCDate()

  return new Date(Date.UTC(utcYear, utcMonth, utcDate))
}

export const toISODate = (value: Date): string => {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

export interface FormatDateTimeOptions extends Intl.DateTimeFormatOptions {
  locale?: string
}

export const formatDateTime = (value: DateInput, options: FormatDateTimeOptions = {}): string => {
  const { locale = DEFAULT_LOCALE, timeZone, ...formatOverrides } = options
  const targetDate = toDateInstance(value)
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: timeZone ?? DEFAULT_TIME_ZONE,
    ...formatOverrides,
  })

  return formatter.format(targetDate)
}

export const formatMonthTitle = (value: Date, locale = DEFAULT_LOCALE): string => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    timeZone: DEFAULT_TIME_ZONE,
  }).format(value)
}

export const formatWeekdayLabel = (value: Date, locale = DEFAULT_LOCALE): string => {
  return new Intl.DateTimeFormat(locale, {
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
    timeZone: DEFAULT_TIME_ZONE,
  }).format(value)
}

export const shiftUTCMonth = (value: Date, offset: number): Date => {
  const shifted = new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), 1))
  shifted.setUTCMonth(shifted.getUTCMonth() + offset, 1)
  return shifted
}

export interface CalendarCell {
  date: Date
  dateIso: string
  isCurrentMonth: boolean
}

const buildWeekRow = (startDate: Date, currentMonth: number): CalendarCell[] => {
  return Array.from({ length: 7 }, (_, index) => {
    const cellDate = new Date(startDate.getTime() + index * MS_PER_DAY)

    return {
      date: cellDate,
      dateIso: toISODate(cellDate),
      isCurrentMonth: cellDate.getUTCMonth() === currentMonth,
    }
  })
}

export const buildCalendarMatrix = (baseDate: Date): CalendarCell[][] => {
  const utcBase = startOfUTCDate(baseDate)
  const dayOfWeek = utcBase.getUTCDay()
  const month = utcBase.getUTCMonth()

  const startOfWeek = new Date(utcBase.getTime() - dayOfWeek * MS_PER_DAY)

  return [
    buildWeekRow(startOfWeek, month),
    buildWeekRow(new Date(startOfWeek.getTime() + 7 * MS_PER_DAY), month),
    buildWeekRow(new Date(startOfWeek.getTime() + 14 * MS_PER_DAY), month),
  ]
}
