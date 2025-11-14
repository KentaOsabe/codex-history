import { useCallback, useMemo, useRef, useState } from 'react'

import { env } from '@/config/env'

import { toISODate } from './dateUtils'

const MIN_KEYWORD_LENGTH = 2
const DEFAULT_SEARCH_LIMIT = 25
const DEFAULT_LIST_PER_PAGE = 25
const MIN_SEARCH_LIMIT = 1
const MAX_SEARCH_LIMIT = 50
const MIN_LIST_PER_PAGE = 1
const MAX_LIST_PER_PAGE = 100
const DEFAULT_PAGE = 1
const MS_PER_DAY = 86_400_000
const KEYWORD_ERROR_MESSAGE = 'キーワードは2文字以上で入力してください'
const DATE_RANGE_ERROR_MESSAGE = '開始日は終了日以前の日付を選択してください'

export interface DateRange {
  startDate: string
  endDate: string
}

interface SearchPaginationState {
  page: number
  limit: number
}

interface ListPaginationState {
  page: number
  perPage: number
}

export interface UseSessionsFiltersOptions {
  initialKeyword?: string
  initialDateRange?: Partial<DateRange>
  defaultRangeDays?: number
  keywordMinLength?: number
  initialSearchLimit?: number
  initialPerPage?: number
  clock?: () => Date
}

export interface UseSessionsFiltersResult {
  keyword: string
  normalizedKeyword?: string
  keywordError?: string
  setKeyword: (value: string) => void
  validateKeyword: () => boolean
  dateRange: DateRange
  setDateRange: (next: Partial<DateRange>) => void
  validateDateRange: () => boolean
  dateRangeError?: string
  searchPagination: SearchPaginationState
  setSearchPage: (page: number) => void
  setSearchLimit: (limit: number) => void
  listPagination: ListPaginationState
  setListPage: (page: number) => void
  setListPerPage: (perPage: number) => void
  clearAll: () => void
}

const clampNumber = (value: number | undefined, min: number, max: number, fallback: number): number => {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback
  }
  const floored = Math.floor(value)
  if (floored < min) return min
  if (floored > max) return max
  return floored
}

const clampPage = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_PAGE
  const floored = Math.floor(value)
  return floored > 0 ? floored : DEFAULT_PAGE
}

const normalizeKeyword = (value: string, minLength: number): string | undefined => {
  const trimmed = value.trim()
  return trimmed.length >= minLength ? trimmed : undefined
}

const normalizeRangeDays = (value: number | undefined): number => {
  if (value === undefined || !Number.isFinite(value)) {
    return 1
  }
  const floored = Math.floor(value)
  return floored > 0 ? floored : 1
}

const computeDefaultRange = (rangeDays: number, now: Date): DateRange => {
  const normalizedDays = normalizeRangeDays(rangeDays)
  const endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const startDate = new Date(endDate.getTime() - (normalizedDays - 1) * MS_PER_DAY)
  return {
    startDate: toISODate(startDate),
    endDate: toISODate(endDate),
  }
}

const isRangeValid = (range: DateRange): boolean => {
  if (!range.startDate || !range.endDate) return false
  return range.startDate <= range.endDate
}

export const useSessionsFilters = (options: UseSessionsFiltersOptions = {}): UseSessionsFiltersResult => {
  const keywordMinLength = options.keywordMinLength ?? MIN_KEYWORD_LENGTH
  const nowRef = useRef<Date>(options.clock ? options.clock() : new Date())
  const defaultRangeDays = options.defaultRangeDays ?? env.defaultDateRange
  const defaultRange = useMemo(
    () => computeDefaultRange(defaultRangeDays, nowRef.current),
    [defaultRangeDays],
  )

  const defaultSearchLimit = clampNumber(options.initialSearchLimit, MIN_SEARCH_LIMIT, MAX_SEARCH_LIMIT, DEFAULT_SEARCH_LIMIT)
  const defaultPerPage = clampNumber(options.initialPerPage, MIN_LIST_PER_PAGE, MAX_LIST_PER_PAGE, DEFAULT_LIST_PER_PAGE)

  const initialRange: DateRange = {
    startDate: options.initialDateRange?.startDate ?? defaultRange.startDate,
    endDate: options.initialDateRange?.endDate ?? defaultRange.endDate,
  }

  const initialRangeRef = useRef(initialRange)

  const [keyword, setKeywordState] = useState(options.initialKeyword ?? '')
  const [keywordError, setKeywordError] = useState<string | undefined>(undefined)
  const [dateRange, setDateRangeState] = useState<DateRange>(initialRange)
  const [dateRangeError, setDateRangeError] = useState<string | undefined>(
    isRangeValid(initialRange) ? undefined : DATE_RANGE_ERROR_MESSAGE,
  )
  const [searchPagination, setSearchPagination] = useState<SearchPaginationState>({
    page: DEFAULT_PAGE,
    limit: defaultSearchLimit,
  })
  const [listPagination, setListPagination] = useState<ListPaginationState>({
    page: DEFAULT_PAGE,
    perPage: defaultPerPage,
  })

  const normalizedKeyword = useMemo(() => normalizeKeyword(keyword, keywordMinLength), [keyword, keywordMinLength])
  const isDateRangeValid = useMemo(() => isRangeValid(dateRange), [dateRange])

  const resetSearchPage = useCallback(() => {
    setSearchPagination((prev) => (prev.page === DEFAULT_PAGE ? prev : { ...prev, page: DEFAULT_PAGE }))
  }, [])

  const resetListPage = useCallback(() => {
    setListPagination((prev) => (prev.page === DEFAULT_PAGE ? prev : { ...prev, page: DEFAULT_PAGE }))
  }, [])

  const setKeyword = useCallback(
    (value: string) => {
      setKeywordState((prev) => {
        if (prev === value) {
          return prev
        }
        resetSearchPage()
        return value
      })
      setKeywordError(undefined)
    },
    [resetSearchPage],
  )

  const setSearchPage = useCallback((page: number) => {
    setSearchPagination((prev) => {
      const nextPage = clampPage(page)
      if (nextPage === prev.page) {
        return prev
      }
      return { ...prev, page: nextPage }
    })
  }, [])

  const setSearchLimit = useCallback((limit: number) => {
    setSearchPagination((prev) => {
      const nextLimit = clampNumber(limit, MIN_SEARCH_LIMIT, MAX_SEARCH_LIMIT, DEFAULT_SEARCH_LIMIT)
      if (nextLimit === prev.limit) {
        return prev
      }
      return {
        page: DEFAULT_PAGE,
        limit: nextLimit,
      }
    })
  }, [])

  const setListPage = useCallback((page: number) => {
    setListPagination((prev) => {
      const nextPage = clampPage(page)
      if (nextPage === prev.page) {
        return prev
      }
      return { ...prev, page: nextPage }
    })
  }, [])

  const setListPerPage = useCallback((perPage: number) => {
    setListPagination((prev) => {
      const nextPerPage = clampNumber(perPage, MIN_LIST_PER_PAGE, MAX_LIST_PER_PAGE, DEFAULT_LIST_PER_PAGE)
      if (nextPerPage === prev.perPage) {
        return prev
      }
      return {
        page: DEFAULT_PAGE,
        perPage: nextPerPage,
      }
    })
  }, [])

  const setDateRange = useCallback(
    (next: Partial<DateRange>) => {
      setDateRangeState((prev) => {
        const merged: DateRange = {
          startDate: next.startDate ?? prev.startDate,
          endDate: next.endDate ?? prev.endDate,
        }
        setDateRangeError(isRangeValid(merged) ? undefined : DATE_RANGE_ERROR_MESSAGE)
        if (merged.startDate !== prev.startDate || merged.endDate !== prev.endDate) {
          resetListPage()
        }
        return merged
      })
    },
    [resetListPage],
  )

  const validateKeyword = useCallback(() => {
    if (normalizedKeyword) {
      setKeywordError(undefined)
      return true
    }
    setKeywordError(KEYWORD_ERROR_MESSAGE)
    return false
  }, [normalizedKeyword])

  const validateDateRange = useCallback(() => {
    if (isDateRangeValid) {
      setDateRangeError(undefined)
      return true
    }
    setDateRangeError(DATE_RANGE_ERROR_MESSAGE)
    return false
  }, [isDateRangeValid])

  const clearAll = useCallback(() => {
    setKeywordState(options.initialKeyword ?? '')
    setKeywordError(undefined)
    const resetRange = initialRangeRef.current
    setDateRangeState(resetRange)
    setDateRangeError(isRangeValid(resetRange) ? undefined : DATE_RANGE_ERROR_MESSAGE)
    setSearchPagination({ page: DEFAULT_PAGE, limit: defaultSearchLimit })
    setListPagination({ page: DEFAULT_PAGE, perPage: defaultPerPage })
  }, [defaultPerPage, defaultSearchLimit, options.initialKeyword])

  return {
    keyword,
    normalizedKeyword,
    keywordError,
    setKeyword,
    validateKeyword,
    dateRange,
    setDateRange,
    validateDateRange,
    dateRangeError,
    searchPagination,
    setSearchPage,
    setSearchLimit,
    listPagination,
    setListPage,
    setListPerPage,
    clearAll,
  }
}

export default useSessionsFilters
