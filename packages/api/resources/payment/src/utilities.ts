import type { PlanPeriod } from './types.js'

const getOneYearTime = (): number => {
  const date = new Date()
  const oneYearFromNow = new Date(new Date().setFullYear(date.getFullYear() + 1))
  return oneYearFromNow.getTime() - date.getTime()
}

const getOneMonthTime = (): number => {
  const oneYearTime = getOneYearTime()
  return Math.round(oneYearTime / 12)
}

/**
 * Get the duration in milliseconds for a billing period.
 * @param period - The billing period ('month' or 'year').
 * @returns The period duration in milliseconds.
 */
export const getPeriodTime = (period: PlanPeriod): number => {
  switch (period) {
    case 'month':
      return getOneMonthTime()
    case 'year':
      return getOneYearTime()
    default:
      return 0
  }
}
