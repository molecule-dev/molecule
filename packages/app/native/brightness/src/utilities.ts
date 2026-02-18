/**
 * `@molecule/app-brightness`
 * Utility functions for brightness
 */

import { getBrightness, setBrightness } from './brightness.js'

/**
 * Convert a brightness value (0-1) to a percentage (0-100).
 * @param brightness - Brightness value between 0 and 1.
 * @returns The brightness as a rounded integer percentage.
 */
export function toPercentage(brightness: number): number {
  return Math.round(brightness * 100)
}

/**
 * Convert a percentage (0-100) to a brightness value (0-1).
 * @param percentage - Percentage value between 0 and 100.
 * @returns The brightness as a decimal between 0 and 1.
 */
export function fromPercentage(percentage: number): number {
  return percentage / 100
}

/**
 * Clamp a brightness value to the valid range (0-1).
 * @param brightness - The brightness value to clamp.
 * @returns The clamped brightness value between 0 and 1.
 */
export function clamp(brightness: number): number {
  return Math.max(0, Math.min(1, brightness))
}

/**
 * Execute a callback with a temporary brightness level, then restore the previous brightness.
 * @param brightness - The temporary brightness value (0-1) to set during the callback.
 * @param callback - The function to execute while the temporary brightness is active.
 * @returns The return value of the callback.
 */
export async function withBrightness<T>(
  brightness: number,
  callback: () => T | Promise<T>,
): Promise<T> {
  const previous = await getBrightness()

  try {
    await setBrightness(brightness)
    return await callback()
  } finally {
    await setBrightness(previous)
  }
}

/**
 * Create a brightness controller for smooth brightness animations using ease-out cubic easing.
 * @returns A controller with `animateTo`, `stop`, and `isAnimating` methods.
 */
export function createBrightnessController(): {
  animateTo(target: number, duration?: number): Promise<void>
  stop(): void
  isAnimating(): boolean
} {
  let animationFrame: number | null = null
  let targetBrightness = 0
  let isAnimating = false

  return {
    /**
     * Animate brightness to a target value using ease-out cubic easing.
     * @param target - Target brightness value (0-1).
     * @param duration - Animation duration in milliseconds (default: 300).
     * @returns A promise that resolves when the animation completes.
     */
    async animateTo(target: number, duration = 300): Promise<void> {
      if (typeof requestAnimationFrame === 'undefined') {
        return setBrightness(target)
      }

      targetBrightness = clamp(target)
      isAnimating = true

      const start = await getBrightness()
      const startTime = performance.now()
      const diff = targetBrightness - start

      return new Promise((resolve) => {
        const animate = async (currentTime: number): Promise<void> => {
          if (!isAnimating) {
            resolve()
            return
          }

          const elapsed = currentTime - startTime
          const progress = Math.min(1, elapsed / duration)

          // Ease-out cubic
          const eased = 1 - Math.pow(1 - progress, 3)
          const current = start + diff * eased

          await setBrightness(current)

          if (progress < 1) {
            animationFrame = requestAnimationFrame(animate)
          } else {
            isAnimating = false
            animationFrame = null
            resolve()
          }
        }

        animationFrame = requestAnimationFrame(animate)
      })
    },

    /**
     * Stop the current brightness animation.
     */
    stop(): void {
      isAnimating = false
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame)
        animationFrame = null
      }
    },

    /**
     * Check if a brightness animation is currently in progress.
     * @returns Whether an animation is active.
     */
    isAnimating(): boolean {
      return isAnimating
    },
  }
}
