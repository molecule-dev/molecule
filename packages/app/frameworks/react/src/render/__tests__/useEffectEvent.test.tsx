// @vitest-environment jsdom
import { act, render } from '@testing-library/react'
import * as React from 'react'
import { type ReactElement, startTransition, Suspense, use, useEffect, useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useEffectEvent as moleculeUseEffectEvent } from '../useEffectEvent.js'
import { useStableCallback } from '../useStableCallback.js'

afterEach(() => {
  vi.doUnmock('react')
  vi.resetModules()
})

/** A promise that never settles: a child that reads it suspends for good. */
const never = new Promise<never>(() => {})

/** Suspends while `k` is 'B', so a transition to 'B' renders and is never committed. */
function Blocker({ k }: { k: string }): null {
  if (k === 'B') use(never)
  return null
}

describe('useEffectEvent', () => {
  it("is React's own useEffectEvent where React has one", () => {
    expect('useEffectEvent' in React).toBe(true)
    expect(moleculeUseEffectEvent).toBe(React.useEffectEvent)
  })

  it('is useStableCallback on a React without useEffectEvent', async () => {
    vi.resetModules()
    vi.doMock('react', async (importOriginal) => {
      const { useEffectEvent: _absent, ...older } = await importOriginal<typeof React>()
      return older
    })
    const fallback = await import('../useEffectEvent.js')
    const stable = await import('../useStableCallback.js')
    expect(fallback.useEffectEvent).toBe(stable.useStableCallback)
  })
})

// One contract, run against React's hook (19.2+) and the stand-in used on React 18 to 19.1, so
// the older path is exercised although only one React is installed. The parameter carries the
// hook's own name, which is how the lint plugin knows its result is an Effect Event.
describe.each([
  ['React.useEffectEvent', React.useEffectEvent],
  ['useStableCallback', useStableCallback],
] as const)('the Effect Event contract: %s', (_name, useEffectEvent: typeof useStableCallback) => {
  it('reads the latest committed props from an effect that does not re-run', () => {
    const probe: { fire?: () => void; effects: number } = { effects: 0 }
    const seen = vi.fn<(value: number) => void>()

    function Ticker({ value }: { value: number }): ReactElement | null {
      const onTick = useEffectEvent(() => seen(value))
      useEffect(() => {
        probe.effects += 1
        probe.fire = () => onTick()
      }, [])
      return null
    }

    const { rerender } = render(<Ticker value={1} />)
    rerender(<Ticker value={2} />)
    act(() => probe.fire?.())

    expect(probe.effects).toBe(1)
    expect(seen).toHaveBeenCalledWith(2)
  })

  it('keeps the committed props when React discards a render', async () => {
    const probe: { fire?: () => string; goTo?: (k: string) => void } = {}
    const rendered = vi.fn<(k: string) => void>()

    function Reader({ k, onRender }: { k: string; onRender: (k: string) => void }): null {
      onRender(k)
      const read = useEffectEvent(() => k)
      useEffect(() => {
        probe.fire = () => read()
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

    expect(rendered).toHaveBeenCalledWith('B')
    expect(probe.fire?.()).toBe('A')
  })
})
