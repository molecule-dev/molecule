/**
 * A background run that yields to the sandbox's own foreground work (a walk, build, deploy or
 * install the host did not start) waits longer before each further attempt.
 *
 * Each attempt costs a native start and a process scan in the sandbox it shares with that work.
 * Retrying every second through a three-minute walk started about ninety of them beside it; in
 * recorded runs the background restarted 33 times inside every deployed walk. The wait now
 * doubles from `yieldRetryMs` to sixteen times it; a run that finishes resets it, and a source
 * write still starts an attempt at once.
 */
import { afterEach, expect, it, vi } from 'vitest'

import { createPlaywrightFeedback } from '../playwright-feedback.js'
import type {
  PlaywrightFeedback,
  PlaywrightFeedbackOptions,
  PlaywrightFeedbackResult,
} from '../playwright-feedback-types.js'

const controllers: PlaywrightFeedback[] = []
afterEach(async () => Promise.all(controllers.splice(0).map((controller) => controller.close())))

const BASE = 40
const spec = { path: '/shop/e2e/checkout.spec.ts', content: '', command: '', cwd: '/shop' }

/** A controller over one spec whose runs answer what `answer` says, timestamping each start. */
function fixture(answer: () => PlaywrightFeedbackResult['status']) {
  const starts: number[] = []
  const run: PlaywrightFeedbackOptions['run'] = async (s, _files, revision) => {
    starts.push(performance.now())
    return { spec: s.path, revision, status: answer(), durationMs: 1, failures: [] }
  }
  const controller = createPlaywrightFeedback({
    load: async () => ({ sources: [], specs: [spec] }),
    run,
    debounceMs: 1,
    yieldRetryMs: BASE,
  })
  controllers.push(controller)
  return { controller, starts }
}

const gaps = (starts: number[]): number[] => starts.slice(1).map((t, i) => t - starts[i])

it('doubles the wait after each consecutive yield, up to sixteen times the first', async () => {
  const f = fixture(() => 'cancelled')
  f.controller.changed(['/shop/src/Checkout.tsx'])
  // 40, 80, 160, 320, 640, 640 ms: seven starts in about 1.9 s. A fixed 40 ms retry makes ~45.
  await vi.waitFor(() => expect(f.starts.length).toBeGreaterThanOrEqual(7), { timeout: 4000 })
  await f.controller.close()
  const g = gaps(f.starts)
  // Lower bounds come from the schedule itself, never from the previous gap: a loaded machine
  // only makes a timer late, and one late wait must not raise the bar for the next.
  for (let i = 0; i < 5; i++) expect(g[i]).toBeGreaterThanOrEqual(BASE * 2 ** i * 0.9)
  // Capped: the sixth wait is the cap again (640 ms), never 32 times the first (1280 ms).
  expect(g[5]).toBeGreaterThanOrEqual(BASE * 16 * 0.9)
  expect(g[5]).toBeLessThan(BASE * 32 * 0.95)
}, 10_000)

it('starts the next yield at the first wait again after a run that finished', async () => {
  let calls = 0
  // Three yields, one pass, then yields again.
  const f = fixture(() => (++calls === 4 ? 'passed' : 'cancelled'))
  f.controller.changed(['/shop/src/Checkout.tsx'])
  await vi.waitFor(() => expect(f.starts.length).toBe(4), { timeout: 4000 })
  // The pass completed the spec; a write makes it eligible again, and it yields from here on.
  f.controller.changed(['/shop/src/Checkout.tsx'])
  await vi.waitFor(() => expect(f.starts.length).toBeGreaterThanOrEqual(6), { timeout: 4000 })
  await f.controller.close()
  const g = gaps(f.starts)
  // The yield after the pass waits the first interval (40 ms), not the fourth (320 ms); the bound
  // leaves 200 ms for a late timer on a loaded machine.
  expect(g[4]).toBeLessThan(BASE * 6)
}, 10_000)

it('still tries again at once when a source write lands during a long wait', async () => {
  const f = fixture(() => 'cancelled')
  f.controller.changed(['/shop/src/Checkout.tsx'])
  // Five yields: the next wait is the cap (640 ms).
  await vi.waitFor(() => expect(f.starts.length).toBe(5), { timeout: 4000 })
  const wroteAt = performance.now()
  f.controller.changed(['/shop/src/Checkout.tsx'])
  await vi.waitFor(() => expect(f.starts.length).toBe(6), { timeout: 4000 })
  await f.controller.close()
  // At once, not after the cap (640 ms); the bound leaves room for a late timer under load.
  expect(f.starts[5] - wroteAt).toBeLessThan(BASE * 8)
}, 10_000)
