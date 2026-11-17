/**
 * The headless hooks runtime follows React's rules where they change behaviour: setter bail-out,
 * effects only while connected, all cleanups before all re-runs, batched updates, stable
 * callbacks and handler wrappers, and a refusal of a hook-order change or a render that never settles.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import { createHeadlessHooksSession, type PrimitiveHooks } from '../components/headless-hooks.js'

const microtask = (): Promise<void> => new Promise((resolve) => queueMicrotask(resolve))

describe('createHeadlessHooksSession', () => {
  it('renders once on creation and runs no effect before connect', () => {
    const log: string[] = []
    const session = createHeadlessHooksSession(({ useEffect, useState }: PrimitiveHooks) => {
      const [count] = useState(1)
      log.push(`render ${count}`)
      useEffect(() => {
        log.push('effect')
      }, [])
      return { count }
    })
    expect(session.getState().count).toBe(1)
    expect(log).toEqual(['render 1'])
    session.connect()
    expect(log).toEqual(['render 1', 'render 1', 'effect'])
  })

  it('a handler batches its updates into one render before it returns, and ignores an unchanged value', () => {
    let renders = 0
    const session = createHeadlessHooksSession(({ useState }: PrimitiveHooks) => {
      renders += 1
      const [a, setA] = useState(0)
      const [b, setB] = useState('x')
      return {
        a,
        b,
        both: () => {
          setA((n) => n + 1)
          setA((n) => n + 1)
          setB('y')
        },
        same: () => setB('y'),
      }
    })
    session.connect()
    const before = renders
    session.getState().both()
    expect(session.getState()).toMatchObject({ a: 2, b: 'y' })
    expect(renders).toBe(before + 1)
    session.getState().same()
    expect(renders).toBe(before + 1)
  })

  it('updates outside a handler render once on the next microtask', async () => {
    let renders = 0
    let set: (next: number) => void = () => {}
    const session = createHeadlessHooksSession(({ useState }: PrimitiveHooks) => {
      renders += 1
      const [value, setValue] = useState(0)
      set = setValue
      return { value }
    })
    session.connect()
    const before = renders
    set(1)
    set(2)
    expect(session.getState().value).toBe(0)
    await microtask()
    expect(session.getState().value).toBe(2)
    expect(renders).toBe(before + 1)
  })

  it('re-runs an effect only when its deps change, running every cleanup before any re-run', () => {
    const log: string[] = []
    let setValue: (next: number) => void = () => {}
    const session = createHeadlessHooksSession(({ useEffect, useState }: PrimitiveHooks) => {
      const [value, set] = useState(0)
      setValue = set
      useEffect(() => {
        log.push(`a run ${value}`)
        return () => log.push(`a cleanup ${value}`)
      }, [value])
      useEffect(() => {
        log.push(`b run ${value}`)
        return () => log.push(`b cleanup ${value}`)
      }, [value])
      useEffect(() => {
        log.push('c run')
      }, [])
      return { bump: () => setValue(value + 1) }
    })
    session.connect()
    expect(log).toEqual(['a run 0', 'b run 0', 'c run'])
    log.length = 0
    session.getState().bump()
    expect(log).toEqual(['a cleanup 0', 'b cleanup 0', 'a run 1', 'b run 1'])
    log.length = 0
    session.rerender()
    expect(log).toEqual([])
  })

  it('an effect without deps runs after every render', () => {
    let runs = 0
    const session = createHeadlessHooksSession(({ useEffect }: PrimitiveHooks) => {
      useEffect(() => {
        runs += 1
      })
      return {}
    })
    session.connect()
    session.rerender()
    session.rerender()
    expect(runs).toBe(3)
  })

  it('state an effect sets renders again in the same flush, and listeners hear the settled result', () => {
    const seen: number[] = []
    const session = createHeadlessHooksSession(({ useEffect, useState }: PrimitiveHooks) => {
      const [value, setValue] = useState(0)
      useEffect(() => {
        if (value < 3) setValue(value + 1)
      }, [value])
      return { value }
    })
    session.subscribe(() => seen.push(session.getState().value))
    session.connect()
    expect(session.getState().value).toBe(3)
    expect(seen).toEqual([3])
  })

  it('disconnect runs every cleanup; a later connect runs every effect again', () => {
    const log: string[] = []
    const session = createHeadlessHooksSession(({ useEffect }: PrimitiveHooks) => {
      useEffect(() => {
        log.push('run')
        return () => log.push('cleanup')
      }, [])
      return {}
    })
    const disconnect = session.connect()
    disconnect()
    disconnect()
    expect(log).toEqual(['run', 'cleanup'])
    session.connect()
    expect(log).toEqual(['run', 'cleanup', 'run'])
  })

  it('keeps refs and callbacks across renders until the callback deps change', () => {
    let setValue: (next: number) => void = () => {}
    const session = createHeadlessHooksSession(
      ({ useCallback, useRef, useState }: PrimitiveHooks) => {
        const box = useRef({ id: 'box' })
        const [value, set] = useState(0)
        setValue = set
        const stable = useCallback(() => 'stable', [])
        const tracking = useCallback(() => value, [value])
        return { box, stable, tracking, value }
      },
    )
    session.connect()
    const first = session.getState()
    session.rerender()
    const second = session.getState()
    expect(second.box).toBe(first.box)
    expect(second.stable).toBe(first.stable)
    expect(second.tracking).toBe(first.tracking)
    session.getState().stable()
    setValue(5)
    return microtask().then(() => {
      const third = session.getState()
      expect(third.stable).toBe(first.stable)
      expect(third.tracking).not.toBe(first.tracking)
      expect(third.tracking()).toBe(5)
    })
  })

  it('refuses a render that calls its hooks in a different order', () => {
    let swap = false
    const session = createHeadlessHooksSession(({ useRef, useState }: PrimitiveHooks) => {
      if (swap) useRef(0)
      else useState(0)
      return {}
    })
    swap = true
    expect(() => session.rerender()).toThrow(
      /hook 0 was a state on the first render and is a ref now/,
    )
  })

  it('refuses a render that never settles', () => {
    const session = createHeadlessHooksSession(({ useEffect, useState }: PrimitiveHooks) => {
      const [value, setValue] = useState(0)
      useEffect(() => {
        setValue(value + 1)
      })
      return {}
    })
    expect(() => session.connect()).toThrow(/did not settle after 50 passes/)
  })
})
