/**
 * The 24h temperature sparkline's path geometry, shared by the package's
 * component. A port of `buildSparkline` from
 * `@molecule/app-weather-card-react`'s `WeatherCard`: same fallback path, same
 * coordinate rounding, so the SVG matches React node for node.
 *
 * @module
 */

import type { WeatherTracePoint } from './types.js'

/** The sparkline's fixed DECORATIVE path, used when the trace is absent or too short. */
export const FALLBACK_SPARKLINE = {
  fill: 'M0,68 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42 L400,100 L0,100 Z',
  stroke: 'M0,68 Q40,52 80,46 T160,38 T240,55 T320,28 T400,42',
}

/** The sparkline's SVG path data: the area `fill` and the line `stroke`. */
export interface SparklinePaths {
  fill: string
  stroke: string
}

/**
 * Computes SVG fill and stroke path data for the 24h temperature sparkline.
 *
 * @param trace - The trace, when the caller supplied one.
 * @returns The area `fill` path and the line `stroke` path.
 */
export function buildSparkline(
  trace: ReadonlyArray<WeatherTracePoint> | undefined,
): SparklinePaths {
  if (!trace || trace.length < 2) return FALLBACK_SPARKLINE
  const W = 400
  const H = 100
  const values = trace.map((p) => p.temperature)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W
    const y = H - ((v - min) / range) * (H * 0.85) - H * 0.1
    return [x, y] as const
  })
  const stroke = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  const fill = `${stroke} L${W},${H} L0,${H} Z`
  return { fill, stroke }
}
