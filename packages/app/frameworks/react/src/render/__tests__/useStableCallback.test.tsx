// @vitest-environment jsdom
import { act, render, renderHook } from '@testing-library/react'
import { type ReactElement, startTransition, Suspense, use, useEffect, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useStableCallback } from '../useStableCallback.js'

/** A promise that never settles: a child that reads it suspends for good. */
const never = new Promise<never>(() => {})

/** Suspends while `k` is 'B', so a transition to 'B' renders and is never committed. */
function Blocker({ k }: { k: string }): null {
  if (k === 'B') use(never)
  return null
}

describe('useStableCallback', () => {
  it('returns the same function on every render', () => {
    const { result, rerender } = renderHook(({ value }) => useStableCallback(() => value), {
      initialProps: { value: 1 },
    })
    const first = result.current
    rerender({ value: 2 })
    expect(result.current).toBe(first)
  })

  it('calls the handler of the latest committed render', () => {
    const { result, rerender } = renderHook(({ value }) => useStableCallback(() => value), {
      initialProps: { value: 1 },
    })
    rerender({ value: 2 })
    expect(result.current()).toBe(2)
  })

  it('passes the arguments through and returns the result', () => {
    const { result } = renderHook(() => useStableCallback((a: number, b: number) => a + b))
    expect(result.current(2, 3)).toBe(5)
  })

  it('keeps the committed handler when React discards a render', async () => {
    const probe: { read?: () => string; goTo?: (k: string) => void } = {}
    const rendered = vi.fn<(k: string) => void>()

    function Reader({ k, onRender }: { k: string; onRender: (k: string) => void }): null {
      onRender(k)
      const read = useStableCallback(() => k)
      useEffect(() => {
        probe.read = read
      }, [read])
      return null
    }
    function App(): ReactElement {
      const [k, setK] = useState('A')
      useEffect(() => {
        probe.goTo = (next) => startTransition(() => setK(next))
      }, [])
      return (
        <Suspense fallback={null}>
          <Reader k={k} onRender={rendered} />
          <Blocker k={k} />
        </Suspense>
      )
    }

    render(<App />)
    await act(async () => probe.goTo?.('B'))

    // React rendered key B, then threw that render away when Blocker suspended.
    expect(rendered).toHaveBeenCalledWith('B')
    expect(probe.read?.()).toBe('A')
  })
})
