/**
 * A case's steps never land in the millisecond the case last rendered in, as a user's input
 * never does. Vue ignores an event that a handler first saw no later than the moment the next
 * handler was attached, so a click in the mount's millisecond that bubbles from a button to a
 * clickable card reached only the button: the Vue Card counterexample failed about once in 150
 * loaded runs, and once refused a release.
 *
 * `Date.now()` is stubbed to stay on the mount's millisecond until it has been read 2,000 times,
 * which only the runner's wait does: without it the click is stamped with the mount's
 * millisecond, every time.
 *
 * @module
 */

import '../ui/setup.js'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h } from 'vue'

import {
  afterRenderMillisecond,
  CallRecorder,
  type MountedCase,
  nextMillisecond,
  RENDER_MILLISECOND_LIMIT_MS,
  runSteps,
  settle,
  type UICase,
} from '../ui/index.js'

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

/** Stub `Date.now()`: the mount's millisecond for the first `reads` reads, the next one after. */
const clockStuckFor = (reads: number): void => {
  let count = 0
  const start = 1_800_000_000_000
  vi.spyOn(Date, 'now').mockImplementation(() => (++count > reads ? start + 1 : start))
}

/** A Vue card with a click listener around a button with its own. */
const vueCard =
  (log: string[]) =>
  async (container: HTMLElement): Promise<MountedCase> => {
    const app = createApp({
      render: () =>
        h('div', { onClick: () => log.push('card') }, [
          h('button', { onClick: () => log.push('button') }, 'Delete'),
        ]),
    })
    app.mount(container)
    return {
      flush: settle,
      setProps: async () => undefined,
      location: () => '/',
      navigate: () => undefined,
      unmount: async () => app.unmount(),
    }
  }

const clickTheButton: UICase = {
  name: 'a button click reaches the card',
  interactions: [{ type: 'click', selector: 'button' }],
}

describe('steps after a render', () => {
  it('reach every listener when the clock has not moved since the mount', async () => {
    clockStuckFor(2_000)
    const log: string[] = []
    await runSteps(clickTheButton, vueCard(log), new CallRecorder({}))
    expect(log).toEqual(['button', 'card'])
  })

  it('counterexample: a click in the mount millisecond reaches only the button', async () => {
    clockStuckFor(Number.POSITIVE_INFINITY)
    const log: string[] = []
    const container = document.createElement('div')
    document.body.append(container)
    const mounted = await vueCard(log)(container)
    container.querySelector('button')!.click()
    await mounted.unmount()
    container.remove()
    expect(log).toEqual(['button'])
  })
})

describe('the input-time helpers', () => {
  it('returns once Date.now() has moved past the render', () => {
    clockStuckFor(500)
    const renderedAt = Date.now()
    afterRenderMillisecond(renderedAt)
    expect(Date.now()).toBeGreaterThan(renderedAt)
  })

  it('returns at once on a clock already past the render', () => {
    const started = performance.now()
    afterRenderMillisecond(Date.now() - 5)
    expect(performance.now() - started).toBeLessThan(RENDER_MILLISECOND_LIMIT_MS / 2)
  })

  it("leaves the time to a case's fake clock", () => {
    vi.useFakeTimers({ toFake: ['Date'], now: 1_000 })
    const started = performance.now()
    afterRenderMillisecond(1_000)
    expect(performance.now() - started).toBeLessThan(RENDER_MILLISECOND_LIMIT_MS / 2)
    expect(Date.now()).toBe(1_000)
  })

  it('nextMillisecond returns in a later millisecond than it was called in', () => {
    clockStuckFor(500)
    const calledAt = Date.now()
    nextMillisecond()
    expect(Date.now()).toBeGreaterThan(calledAt)
  })

  it('gives up on a clock that never moves', () => {
    clockStuckFor(Number.POSITIVE_INFINITY)
    const started = performance.now()
    afterRenderMillisecond(Date.now())
    const waited = performance.now() - started
    expect(waited).toBeGreaterThanOrEqual(RENDER_MILLISECOND_LIMIT_MS * 0.9)
    expect(waited).toBeLessThan(RENDER_MILLISECOND_LIMIT_MS * 10)
  })
})
