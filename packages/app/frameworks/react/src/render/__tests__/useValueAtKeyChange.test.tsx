// @vitest-environment jsdom
import { act, render, renderHook } from '@testing-library/react'
import { type ReactElement, startTransition, Suspense, use, useEffect, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useValueAtKeyChange } from '../useValueAtKeyChange.js'

/** A promise that never settles: a child that reads it suspends for good. */
const never = new Promise<never>(() => {})

/** Suspends while `k` is 'B', so a transition to 'B' renders and is never committed. */
function Blocker({ k }: { k: string }): null {
  if (k === 'B') use(never)
  return null
}

describe('useValueAtKeyChange', () => {
  it('keeps the first value while the keys stay equal', () => {
    const { result, rerender } = renderHook(
      ({ id }) => useValueAtKeyChange({ id, at: Math.random() }, [id]),
      { initialProps: { id: 'a' } },
    )
    const first = result.current
    rerender({ id: 'a' })
    expect(result.current).toBe(first)
  })

  it('takes the new value when a key changes', () => {
    const { result, rerender } = renderHook(({ id }) => useValueAtKeyChange({ id }, [id]), {
      initialProps: { id: 'a' },
    })
    const first = result.current
    rerender({ id: 'b' })
    expect(result.current).not.toBe(first)
    expect(result.current).toEqual({ id: 'b' })
  })

  it('compares keys with Object.is', () => {
    const { result, rerender } = renderHook(({ key }) => useValueAtKeyChange({ key }, [key]), {
      initialProps: { key: Number.NaN },
    })
    const first = result.current
    rerender({ key: Number.NaN })
    expect(result.current).toBe(first)
    rerender({ key: 0 })
    const zero = result.current
    rerender({ key: -0 })
    expect(result.current).not.toBe(zero)
  })

  it('counts a change in the number of keys as a change', () => {
    const { result, rerender } = renderHook(({ keys }) => useValueAtKeyChange({ keys }, keys), {
      initialProps: { keys: ['a'] },
    })
    const first = result.current
    rerender({ keys: ['a', 'b'] })
    expect(result.current).not.toBe(first)
    expect(result.current).toEqual({ keys: ['a', 'b'] })
  })

  it('keeps the committed value when React discards a render', async () => {
    const probe: { subscribes: number; goTo?: (k: string) => void; bump?: () => void } = {
      subscribes: 0,
    }
    const rendered = vi.fn<(k: string) => void>()

    function Query({ k, onRender }: { k: string; onRender: (k: string) => void }): null {
      onRender(k)
      // A fresh options object on every render, as a caller writes it inline.
      const stable = useValueAtKeyChange({ key: k }, [k])
      useEffect(() => {
        probe.subscribes += 1
      }, [stable])
      return null
    }
    function App(): ReactElement {
      const [k, setK] = useState('A')
      const [, setTick] = useState(0)
      useEffect(() => {
        probe.goTo = (next) => startTransition(() => setK(next))
        probe.bump = () => setTick((n) => n + 1)
      }, [])
      return (
        <Suspense fallback={null}>
          <Query k={k} onRender={rendered} />
          <Blocker k={k} />
        </Suspense>
      )
    }

    render(<App />)
    expect(probe.subscribes).toBe(1)
    await act(async () => probe.goTo?.('B'))
    expect(rendered).toHaveBeenCalledWith('B')
    // An urgent update re-renders key A while the transition to B stays suspended.
    const before = rendered.mock.calls.length
    await act(async () => probe.bump?.())

    expect(rendered.mock.calls.slice(before).map(([k]) => k)).toContain('A')
    expect(probe.subscribes).toBe(1)
  })
})
