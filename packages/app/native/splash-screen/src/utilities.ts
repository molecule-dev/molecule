/**
 * `@molecule/app-splash-screen`
 * Utility functions for splash screen module.
 */

import { hide } from './provider.js'
import type { SplashScreenHideOptions } from './types.js'

/**
 * Hide the splash screen once a readiness condition is met.
 * Evaluates the condition immediately; hides only if it returns true.
 * @param condition - Function returning whether the app is ready (sync or async).
 * @param options - Fade-out animation options for hiding.
 */
export async function hideWhenReady(
  condition: () => Promise<boolean> | boolean,
  options?: SplashScreenHideOptions,
): Promise<void> {
  const isReady = await condition()
  if (isReady) {
    await hide(options)
  }
}

/**
 * Run an async task while ensuring the splash screen stays visible for at least
 * `minDuration` milliseconds. Hides the splash after both the task completes and
 * the minimum duration elapses.
 * @param minDuration - Minimum time in milliseconds to keep the splash screen visible.
 * @param task - The async initialization task to run while splash is shown.
 * @param options - Fade-out animation options for hiding.
 * @returns The return value of the task.
 */
export async function showForMinDuration<T>(
  minDuration: number,
  task: () => Promise<T>,
  options?: SplashScreenHideOptions,
): Promise<T> {
  const startTime = Date.now()

  try {
    const result = await task()

    const elapsed = Date.now() - startTime
    const remaining = minDuration - elapsed

    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining))
    }

    return result
  } finally {
    await hide(options)
  }
}

/**
 * Create a task-based splash screen controller for complex multi-step loading scenarios.
 * Register tasks with `startTask()`, complete them with `completeTask()`. The splash
 * screen is automatically hidden when all registered tasks are complete.
 * @returns A controller object with methods to manage loading tasks.
 */
export function createSplashController(): {
  startTask(taskId: string): void
  completeTask(taskId: string, options?: SplashScreenHideOptions): Promise<void>
  forceHide(options?: SplashScreenHideOptions): Promise<void>
  getPendingCount(): number
  isComplete(): boolean
  reset(): void
} {
  const loadingTasks: Set<string> = new Set()
  let isHidden = false

  return {
    /**
     * Register a loading task that must complete before the splash screen hides.
     * @param taskId - Unique identifier for the task.
     */
    startTask(taskId: string): void {
      loadingTasks.add(taskId)
    },

    /**
     * Mark a loading task as complete. Automatically hides the splash screen
     * when all registered tasks are complete.
     * @param taskId - The task identifier to mark as complete.
     * @param options - Fade-out options used when hiding (only when last task completes).
     */
    async completeTask(taskId: string, options?: SplashScreenHideOptions): Promise<void> {
      loadingTasks.delete(taskId)

      if (loadingTasks.size === 0 && !isHidden) {
        isHidden = true
        await hide(options)
      }
    },

    /**
     * Force-hide the splash screen immediately, clearing all pending tasks.
     * @param options - Fade-out animation options.
     */
    async forceHide(options?: SplashScreenHideOptions): Promise<void> {
      loadingTasks.clear()
      isHidden = true
      await hide(options)
    },

    /**
     * Get the number of loading tasks still pending.
     * @returns The count of incomplete tasks.
     */
    getPendingCount(): number {
      return loadingTasks.size
    },

    /**
     * Check if all registered loading tasks have completed.
     * @returns Whether all tasks are done.
     */
    isComplete(): boolean {
      return loadingTasks.size === 0
    },

    /**
     * Reset the controller to its initial state, allowing it to be reused.
     */
    reset(): void {
      loadingTasks.clear()
      isHidden = false
    },
  }
}
