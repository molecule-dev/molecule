// @vitest-environment node
/**
 * The stall watchdog ends a process whose main thread stops yielding and names what holds it:
 * a microtask loop (the Vue `watchEffect` hang of 2026-11-19) and a synchronous spin both end
 * with the label and the spinning function's line, while a process that keeps yielding runs
 * to its end untouched.
 */
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const WATCHDOG = fileURLToPath(new URL('../stall-watchdog.ts', import.meta.url))

/**
 * Runs `body` in a child Node process that has started a 2 s watchdog labeled `a probe case`.
 *
 * @param body - The child's code after the watchdog starts.
 * @param before - The child's code before the watchdog starts.
 * @returns The child's exit signal, status and stderr.
 */
function runChild(
  body: string,
  before = '',
): {
  signal: NodeJS.Signals | null
  status: number | null
  stderr: string
} {
  const script = `${before}
import(${JSON.stringify(WATCHDOG)}).then(({ startStallWatchdog }) => {
  const watchdog = startStallWatchdog(2)
  watchdog.setLabel('a probe case')
  ${body}
})`
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    encoding: 'utf8',
    timeout: 30_000,
  })
  return { signal: result.signal, status: result.status, stderr: result.stderr }
}

describe('startStallWatchdog', () => {
  it('ends a microtask loop with the label and the looping function', () => {
    const { signal, stderr } = runChild(`setTimeout(() => {
    const rerun = () => { Promise.resolve().then(rerun) } // the line the report shows
    rerun()
  }, 200)`)
    expect(signal).toBe('SIGKILL')
    expect(stderr).toContain('has not yielded to the event loop for 2 s, in: a probe case.')
    expect(stderr).toMatch(/at rerun \(/)
    expect(stderr).toContain('// the line the report shows')
  })

  it('ends a synchronous spin with the spinning function', () => {
    const { signal, stderr } = runChild(`setTimeout(function spinForever() {
    for (;;) {} // spinning here
  }, 200)`)
    expect(signal).toBe('SIGKILL')
    expect(stderr).toMatch(/at spinForever \(/)
    expect(stderr).toContain('// spinning here')
  })

  it('keeps its heartbeat when the global timers are faked before it starts', () => {
    // A case's fake timers replace globalThis.setInterval/setTimeout with ones that never fire.
    const fake = 'globalThis.setInterval = () => 0\nglobalThis.setTimeout = () => 0'
    const { signal, status, stderr } = runChild(
      `const timers = process.getBuiltinModule('node:timers')
    let left = 40
    const tick = () => { if (--left > 0) timers.setTimeout(tick, 100); else void watchdog.stop() }
    tick()`,
      fake,
    )
    expect(signal).toBeNull()
    expect(status).toBe(0)
    expect(stderr).toBe('')
  })

  it('leaves a process that keeps yielding alone, past the stall window', () => {
    const { signal, status, stderr } = runChild(`let left = 40
    const tick = () => { if (--left > 0) setTimeout(tick, 100); else { void watchdog.stop().then(() => console.log('done')) } }
    tick()`)
    expect(signal).toBeNull()
    expect(status).toBe(0)
    expect(stderr).toBe('')
  })
})
