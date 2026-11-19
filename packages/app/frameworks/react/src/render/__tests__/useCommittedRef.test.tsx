// @vitest-environment jsdom
import { act, render, renderHook } from '@testing-library/react'
import {
  type ReactElement,
  startTransition,
  Suspense,
  use,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { describe, expect, it, vi } from 'vitest'

import { useCommittedRef } from '../useCommittedRef.js'

/** A promise that never settles: a child that reads it suspends for good. */
const never = new Promise<never>(() => {})

/** Suspends while `k` is 'B', so a transition to 'B' renders and is never committed. */
function Blocker({ k }: { k: string }): null {
  if (k === 'B') use(never)
  return null
}

describe('useCommittedRef', () => {
  it('holds the value of the latest committed render', () => {
    const { result, rerender } = renderHook(
      ({ value }) => {
        const ref = useRef<number | null>(null)
        useCommittedRef(ref, value)
        return ref
      },
      { initialProps: { value: 1 } },
    )
    expect(result.current.current).toBe(1)
    rerender({ value: 2 })
    expect(result.current.current).toBe(2)
  })

  it('is filled before the first layout effect', () => {
    const seen: Array<number | null> = []
    function Probe(): null {
      const ref = useRef<number | null>(null)
      useCommittedRef(ref, 7)
      useLayoutEffect(() => {
        seen.push(ref.current)
      }, [])
      return null
    }
    render(<Probe />)
    expect(seen).toEqual([7])
  })

  it('keeps the committed value when React discards a render', async () => {
    const probe: { read?: () => string | null; goTo?: (k: string) => void } = {}
    const rendered = vi.fn<(k: string) => void>()

    function Reader({ k, onRender }: { k: string; onRender: (k: string) => void }): null {
      onRender(k)
      const ref = useRef<string | null>(null)
      useCommittedRef(ref, k)
      useEffect(() => {
        probe.read = () => ref.current
      }, [])
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
