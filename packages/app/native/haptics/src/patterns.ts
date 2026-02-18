/**
 * `@molecule/app-haptics`
 * Preset haptic patterns for common use cases.
 */

import type { HapticPatternElement, ImpactStyle } from './types.js'

/**
 * Preset haptic patterns for common use cases
 */
export const patterns = {
  /** Double tap pattern */
  doubleTap: [
    { type: 'impact' as const, style: 'light' as ImpactStyle },
    { type: 'pause' as const, duration: 100 },
    { type: 'impact' as const, style: 'light' as ImpactStyle },
  ] as HapticPatternElement[],

  /** Triple tap pattern */
  tripleTap: [
    { type: 'impact' as const, style: 'light' as ImpactStyle },
    { type: 'pause' as const, duration: 100 },
    { type: 'impact' as const, style: 'light' as ImpactStyle },
    { type: 'pause' as const, duration: 100 },
    { type: 'impact' as const, style: 'light' as ImpactStyle },
  ] as HapticPatternElement[],

  /** Success pattern */
  success: [
    { type: 'impact' as const, style: 'light' as ImpactStyle },
    { type: 'pause' as const, duration: 100 },
    { type: 'impact' as const, style: 'medium' as ImpactStyle },
  ] as HapticPatternElement[],

  /** Error pattern */
  error: [
    { type: 'impact' as const, style: 'heavy' as ImpactStyle },
    { type: 'pause' as const, duration: 100 },
    { type: 'impact' as const, style: 'heavy' as ImpactStyle },
    { type: 'pause' as const, duration: 100 },
    { type: 'impact' as const, style: 'heavy' as ImpactStyle },
  ] as HapticPatternElement[],

  /** Warning pattern */
  warning: [
    { type: 'impact' as const, style: 'medium' as ImpactStyle },
    { type: 'pause' as const, duration: 200 },
    { type: 'impact' as const, style: 'medium' as ImpactStyle },
  ] as HapticPatternElement[],

  /** Heartbeat pattern */
  heartbeat: [
    { type: 'impact' as const, style: 'heavy' as ImpactStyle },
    { type: 'pause' as const, duration: 100 },
    { type: 'impact' as const, style: 'light' as ImpactStyle },
    { type: 'pause' as const, duration: 400 },
  ] as HapticPatternElement[],
} as const
