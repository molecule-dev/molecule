/**
 * A recording never counts renders: a hook that reads a fake's state synchronously on every
 * render (`getLayout`, `getDeviceInfo`, `isOnline` …) records the same calls whether it rendered
 * once or four times. When the fakes recorded those reads, a golden counted how often React
 * rendered, which no other framework matches (each renders a different number of times for the
 * same behaviour). Operations (a change, a subscription, a request) are still recorded.
 *
 * @module
 */

import { useEffect, useState } from 'react'
import { describe, expect, it } from 'vitest'

import * as ReactBindings from '@molecule/app-react'

import { runHookCase } from '../bindings/index.js'
import { createReactBindingAdapter } from './react-bindings-adapter.js'

/**
 * Renders three extra times after mount, then stays put.
 *
 * @returns The extra renders done so far.
 */
function useExtraRenders(): number {
  const [renders, setRenders] = useState(0)
  useEffect(() => {
    if (renders < 3) setRenders(renders + 1)
  }, [renders])
  return renders
}

/**
 * The workspace layout's panel count, rendered once.
 *
 * @returns The panel count.
 */
function useLayoutOnce(): number {
  return ReactBindings.useWorkspace().layout.panels.length
}

/**
 * The same value, after three extra renders.
 *
 * @returns The panel count.
 */
function useLayoutRerendered(): number {
  useExtraRenders()
  return useLayoutOnce()
}

/**
 * Whether the device is online, rendered once.
 *
 * @returns The online flag.
 */
function useOnlineOnce(): boolean {
  return ReactBindings.useDevice().isOnline()
}

/**
 * The same flag, after three extra renders.
 *
 * @returns The online flag.
 */
function useOnlineRerendered(): boolean {
  useExtraRenders()
  return useOnlineOnce()
}

/**
 * What the hook returned on mount (a throw would leave nothing to compare).
 *
 * @param result - The case result.
 * @param result.snapshots - Its snapshots.
 * @returns The mount result.
 */
const mounted = (result: { snapshots: unknown[] }): unknown =>
  (result.snapshots[0] as { result?: unknown }).result

const hooks = createReactBindingAdapter({
  ...ReactBindings,
  useLayoutOnce,
  useLayoutRerendered,
  useOnlineOnce,
  useOnlineRerendered,
})

describe('a synchronous read of a fake', () => {
  it('records the same calls however often the workspace hook renders', async () => {
    const context = { areas: { native: { workspace: {} } } }
    const once = await runHookCase(hooks, 'useLayoutOnce', { name: 'once', context })
    const rerendered = await runHookCase(hooks, 'useLayoutRerendered', {
      name: 'rerendered',
      context,
    })
    expect(mounted(once)).toEqual(expect.any(Number))
    expect(once.snapshots).toEqual(rerendered.snapshots)
    expect(rerendered.calls).toEqual(once.calls)
  })

  it('records the same calls however often the device hook renders', async () => {
    const context = { areas: { native: { device: {} } } }
    const once = await runHookCase(hooks, 'useOnlineOnce', { name: 'once', context })
    const rerendered = await runHookCase(hooks, 'useOnlineRerendered', {
      name: 'rerendered',
      context,
    })
    expect(mounted(once)).toBe(true)
    expect(once.snapshots).toEqual(rerendered.snapshots)
    expect(rerendered.calls).toEqual(once.calls)
  })
})
