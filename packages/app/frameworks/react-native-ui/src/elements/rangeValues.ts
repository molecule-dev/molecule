import type { RangeFieldProps } from '@molecule/app-ui'

import { decimalPlaces, scaled } from './decimal.js'

/** Returns numeric range attributes that can be represented in HTML. */
export function finiteRangeNumber(value: number | undefined): number | undefined {
  return value !== undefined && Number.isFinite(value) ? value : undefined
}

/** Divides by a positive integer and rounds toward negative infinity. */
function floorDivide(numerator: bigint, divisor: bigint): bigint {
  return (numerator < 0n ? numerator - divisor + 1n : numerator) / divisor
}

interface StepGrid {
  first: bigint
  last: bigint
  count: bigint
  at(index: bigint): number
  nearest(value: number): bigint
}

/** Finds legal steps in decimal arithmetic so midpoint ties round toward the higher value. */
function ticks(min: number, max: number, step: number, base: number): StepGrid | undefined {
  const places = Math.max(
    decimalPlaces(min),
    decimalPlaces(max),
    decimalPlaces(step),
    decimalPlaces(base),
  )
  const start = scaled(base, places)
  const size = scaled(step, places)
  const first = -floorDivide(start - scaled(min, places), size)
  const last = floorDivide(scaled(max, places) - start, size)
  if (first > last) return undefined

  return {
    count: last - first,
    at(index: bigint): number {
      const tick = index < first ? first : index > last ? last : index
      return Number(`${start + tick * size}e-${places}`)
    },
    nearest(value: number): bigint {
      const precision = Math.max(places, decimalPlaces(value))
      const factor = 10n ** BigInt(precision - places)
      const delta = scaled(value, precision) - start * factor
      const interval = size * factor
      return floorDivide(2n * delta + interval, 2n * interval)
    },
    first,
    last,
  }
}

// The slider wrapper allocates an array of every vendor step on every render.
const MAX_NATIVE_STEPS = 4096n

interface RangeValues {
  low: number
  high: number
  hasChoices: boolean
  hasIntegerAccessibilityValue: boolean
  nativeMax: number
  nativeStep: number
  normalize(value: number | undefined): number
  toNative(value: number): number
  fromNative(position: number): number
  nudge(value: number, direction: -1 | 1): number
  spoken(value: number): string
}

/** Resolves the HTML bounds, default, step grid and positive native slider coordinates. */
export function rangeValues(
  min: number | undefined,
  max: number | undefined,
  step: RangeFieldProps['step'],
  base: number,
): RangeValues {
  const minimum = finiteRangeNumber(min) ?? 0
  const maximum = Math.max(minimum, finiteRangeNumber(max) ?? 100)
  const spacing = step === 'any' ? undefined : step && Number.isFinite(step) && step > 0 ? step : 1
  const midpoint = minimum / 2 + maximum / 2
  const grid = spacing === undefined ? undefined : ticks(minimum, maximum, spacing, base)
  const low = grid?.at(grid.first) ?? minimum
  const high = grid?.at(grid.last) ?? maximum
  const hasChoices = low < high
  const nativeSteps = grid && grid.count <= MAX_NATIVE_STEPS ? Number(grid.count) : 0

  const normalize = (value: number | undefined): number => {
    const clamped = Math.min(maximum, Math.max(minimum, finiteRangeNumber(value) ?? midpoint))
    return grid?.at(grid.nearest(clamped)) ?? clamped
  }

  const proportion = (value: number): number =>
    high - low === Infinity
      ? (value / 2 - low / 2) / (high / 2 - low / 2)
      : (value - low) / (high - low)
  const interpolate = (fraction: number): number => {
    const position = Math.min(1, Math.max(0, fraction))
    return normalize(low * (1 - position) + high * position)
  }

  return {
    low,
    high,
    hasChoices,
    hasIntegerAccessibilityValue:
      spacing !== undefined &&
      Number.isInteger(spacing) &&
      Number.isInteger(low) &&
      Number.isInteger(minimum) &&
      minimum >= -(2 ** 31) &&
      Number.isInteger(maximum) &&
      maximum < 2 ** 31,
    normalize,
    nativeMax: 1 + Math.max(1, nativeSteps),
    nativeStep: nativeSteps ? 1 : 0,
    // Slider 4.5.6 drops a literal zero and Android rejects a zero-length track.
    toNative(value: number): number {
      if (!hasChoices) return 1
      if (grid && nativeSteps) return Number(grid.nearest(value) - grid.first) + 1
      return 1 + proportion(value)
    },
    fromNative(position: number): number {
      if (!hasChoices) return low
      if (grid && nativeSteps) return grid.at(grid.first + BigInt(Math.round(position - 1)))
      return interpolate(position - 1)
    },
    nudge(value: number, direction: -1 | 1): number {
      if (!hasChoices) return low
      if (grid) return grid.at(grid.nearest(value) + BigInt(direction))
      return interpolate(proportion(value) + direction / 100)
    },
    spoken(value: number): string {
      const digits = Math.max(decimalPlaces(spacing ?? value), decimalPlaces(value))
      return digits <= 100 ? value.toFixed(digits) : String(value)
    },
  }
}
