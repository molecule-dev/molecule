/** Number and date constraints used when a native form is submitted. */

import type { TextFieldProps } from '@molecule/app-ui'

import { decimalPlaces, scaled } from './decimal.js'

const FLOAT = /^-?(?:\d+|\d*\.\d+)(?:[eE][+-]?\d+)?$/
const DATE = /^(\d{4,})-(\d{2})-(\d{2})$/
const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334, 365]
const EPOCH_DAY = 719162n // January 1, 1970 as a zero-based Gregorian day number.

/** Converts an HTML floating-point string or a numeric attribute to a finite number. */
function fieldNumber(text: string | number | undefined): number | undefined {
  if (typeof text === 'string' && FLOAT.exec(text)?.[0] !== text) return undefined
  const value = Number(text)
  return Number.isFinite(value) ? value : undefined
}

/** Parses an HTML calendar date and gives its day number without a local time zone. */
function calendarDay(text: string | undefined): bigint | undefined {
  if (text === undefined) return undefined
  const match = DATE.exec(text)
  if (!match || match[0] !== text) return undefined
  const [, yearText, monthText, dateText] = match
  const year = BigInt(yearText)
  const month = Number(monthText)
  const date = Number(dateText)
  if (year === 0n || month < 1 || month > 12 || date < 1) return undefined
  const leap = year % 4n === 0n && (year % 100n !== 0n || year % 400n === 0n)
  const beforeMonth = DAYS_BEFORE_MONTH[month - 1]
  const monthLength = DAYS_BEFORE_MONTH[month] - beforeMonth + (month === 2 && leap ? 1 : 0)
  if (date > monthLength) return undefined
  const previous = year - 1n
  const withinYear = beforeMonth + date - 1 + (month > 2 && leap ? 1 : 0)
  return previous * 365n + previous / 4n - previous / 100n + previous / 400n + BigInt(withinYear)
}

/** Checks inclusive bounds and exact decimal alignment for the allowed step. */
function satisfiesBounds(
  value: number | bigint | undefined,
  minimum: number | bigint | undefined,
  maximum: number | bigint | undefined,
  base: number | bigint,
  step: TextFieldProps['step'],
): boolean {
  if (
    value === undefined ||
    (minimum !== undefined && value < minimum) ||
    (maximum !== undefined && value > maximum)
  )
    return false
  if (step === 'any') return true
  const increment = step !== undefined && Number.isFinite(step) && step > 0 ? step : 1
  const places = Math.max(decimalPlaces(value), decimalPlaces(base), decimalPlaces(increment))
  return (scaled(value, places) - scaled(base, places)) % scaled(increment, places) === 0n
}

/** Validates a nonempty field answer without changing the text in the input. */
export function validBoundedField(props: TextFieldProps, text: string): boolean {
  const attributeValue = props.value ?? props.defaultValue
  if (props.type === 'number') {
    const min = fieldNumber(props.min)
    return satisfiesBounds(
      fieldNumber(text),
      min,
      fieldNumber(props.max),
      min ?? fieldNumber(attributeValue) ?? 0,
      props.step,
    )
  }
  if (props.type === 'date') {
    const min = calendarDay(props.min)
    return satisfiesBounds(
      calendarDay(text),
      min,
      calendarDay(props.max),
      min ?? calendarDay(attributeValue) ?? EPOCH_DAY,
      props.step,
    )
  }
  return true
}
