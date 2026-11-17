/**
 * The case clock's `advance`: each timer callback runs alone in the framework's update scope,
 * so the framework renders and runs its effects before the next one, as in a browser. Checked
 * with React's `act`, the scope the React adapters give: an effect cancels a timer due at the
 * same instant, an interval renders once per tick, a promise chain a timer starts renders before
 * the next timer, a timer created on the way fires only when due by the end, `Date.now()` ends
 * where the step says, a case that fakes only `Date` still moves it, and a settle under fake
 * timers still ends on a real macrotask turn.
 *
 * @module
 */

import { act, createElement, useEffect, useRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { advanceClock, type ClockScope, installCaseClock } from '../ui/clock.js'
import { settle } from '../ui/steps.js'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** React's update scope, as the adapters pass it. */
const inAct: ClockScope = (work) => act(work)

let root: Root | null = null

/**
 * Renders a component into a fresh container inside `act`.
 *
 * @param component - The component.
 * @returns The container.
 */
async function render(component: () => ReturnType<typeof createElement>): Promise<HTMLElement> {
  const container = document.createElement('div')
  document.body.append(container)
  root = createRoot(container)
  await act(async () => {
    root!.render(createElement(component))
  })
  return container
}

afterEach(async () => {
  await act(async () => {
    root?.unmount()
  })
  root = null
  document.body.innerHTML = ''
  vi.useRealTimers()
})

/**
 * Timer A turns a flag on at 1 s; an effect on the flag clears timer B, due at the same 1 s.
 *
 * @param log - Receives `B` when timer B fires.
 * @returns The component.
 */
const cancelling = (log: string[]) =>
  function Cancelling() {
    const [on, setOn] = useState(false)
    const b = useRef<ReturnType<typeof setTimeout> | null>(null)
    useEffect(() => {
      setTimeout(() => setOn(true), 1000)
      b.current = setTimeout(() => log.push('B'), 1000)
    }, [])
    useEffect(() => {
      if (on && b.current) clearTimeout(b.current)
    }, [on])
    return createElement('p', null, on ? 'on' : 'off')
  }

describe('advanceClock', () => {
  it('lets an effect cancel a timer due at the same instant as the one that triggered it', async () => {
    installCaseClock({ fakeTimers: true, now: 0 })
    const log: string[] = []
    const container = await render(cancelling(log))
    await advanceClock(1000, inAct)
    expect(container.textContent).toBe('on')
    expect(log).toEqual([])
  })

  it('differs from one scope around the whole advance, where React renders only at the end', async () => {
    // Why the kit steps timers: in one act() the effect runs after both timers have fired.
    installCaseClock({ fakeTimers: true, now: 0 })
    const log: string[] = []
    await render(cancelling(log))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000)
    })
    expect(log).toEqual(['B'])
  })

  it('renders once per interval tick', async () => {
    installCaseClock({ fakeTimers: true, now: 0 })
    const renders: number[] = []
    const container = await render(function Ticking() {
      const [count, setCount] = useState(0)
      renders.push(count)
      useEffect(() => {
        const id = setInterval(() => setCount((c) => c + 1), 100)
        return () => clearInterval(id)
      }, [])
      return createElement('p', null, String(count))
    })
    await advanceClock(500, inAct)
    expect(container.textContent).toBe('5')
    expect(renders.filter((n) => n > 0)).toEqual([1, 2, 3, 4, 5])
  })

  it('renders what a promise chain started by a timer sets before the next timer runs', async () => {
    installCaseClock({ fakeTimers: true, now: 0 })
    const seen: string[] = []
    let container: HTMLElement | null = null
    container = await render(function Chained() {
      const [text, setText] = useState('idle')
      useEffect(() => {
        setTimeout(() => {
          void Promise.resolve().then(() => setText('loaded'))
        }, 100)
        setTimeout(() => seen.push(container?.textContent ?? ''), 100)
      }, [])
      return createElement('p', null, text)
    })
    await advanceClock(100, inAct)
    expect(seen).toEqual(['loaded'])
  })

  it('fires a timer created on the way only when it is due by the end, and ends Date at start + ms', async () => {
    installCaseClock({ fakeTimers: true, now: 1_000 })
    const fired: number[] = []
    setTimeout(() => {
      fired.push(Date.now())
      setTimeout(() => fired.push(Date.now()), 200)
      setTimeout(() => fired.push(Date.now()), 1000)
    }, 100)
    await advanceClock(500)
    expect(fired).toEqual([1_100, 1_300])
    expect(Date.now()).toBe(1_500)
    await advanceClock(700)
    expect(fired).toEqual([1_100, 1_300, 2_100])
    expect(Date.now()).toBe(2_200)
  })

  it('moves Date when a case fakes only Date', async () => {
    installCaseClock({ now: 5_000 })
    await advanceClock(250)
    expect(Date.now()).toBe(5_250)
  })

  it('settles a long promise chain under fake timers, with no timer due', async () => {
    // A deferred reply's handlers run many promise hops after the answer; the settle that
    // follows a step must let all of them run, as a real macrotask turn does.
    installCaseClock({ fakeTimers: true, now: 0 })
    let done = false
    void (async () => {
      for (let i = 0; i < 20; i++) await Promise.resolve()
      done = true
    })()
    await settle()
    expect(done).toBe(true)
    await advanceClock(0)
    expect(Date.now()).toBe(0)
  })

  it('fails an advance whose timers never drain', async () => {
    installCaseClock({ fakeTimers: true, now: 0 })
    const again = (): void => {
      setTimeout(again, 0)
    }
    again()
    await expect(advanceClock(100, undefined, 50)).rejects.toThrow(
      'more than 50 timer callbacks in one 100 ms advance',
    )
  })
})
