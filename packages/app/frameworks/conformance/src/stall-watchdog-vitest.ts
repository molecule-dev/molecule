/**
 * Starts the stall watchdog (`stall-watchdog.ts`) for a conformance file and names each test
 * it runs, so a case that stops yielding ends the run with its name and stack instead of
 * hanging until an outer timeout.
 *
 * @module
 */

import { beforeEach } from 'vitest'

import { type StallWatchdog, startStallWatchdog } from './stall-watchdog.js'

/**
 * Seconds the main thread may run without yielding before the run ends. A conformance case
 * renders and steps one component; none holds the thread for anything close to this, even on
 * a loaded machine.
 */
export const STALL_SECONDS = 60

/** This module instance's watchdog: one per test file (and per process). */
let watchdog: StallWatchdog | null = null

/**
 * Starts the watchdog once and labels it with each test of the enclosing suite. Call it inside
 * a `describe` (or at a file's top level).
 */
export function watchConformanceEventLoop(): void {
  const running = watchdog ?? startStallWatchdog(STALL_SECONDS)
  watchdog = running
  beforeEach((context) => {
    running.setLabel(context.task.fullTestName ?? context.task.name)
  })
}
