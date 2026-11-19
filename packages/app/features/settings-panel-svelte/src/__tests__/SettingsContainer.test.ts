// @vitest-environment jsdom

/**
 * Unit tests for the Svelte `SettingsContainer` — a port of
 * `@molecule/app-settings-panel-react/src/__tests__/SettingsContainer.test.tsx`:
 * the same context-publishing behaviour, rendered with a real Svelte mount in
 * jsdom and observed through a consumer component that reads the container's
 * context.
 *
 * Svelte has no component re-render to count (a component's init runs once),
 * so React's `rerender` becomes the port's way of setting a prop — assigning
 * to the reactive prop bag the host receives — and React's consumer render
 * count becomes the identity of the context value the consumer holds, which
 * the container's context keeps across a parent update.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { captured, resetCaptured } from './context-capture.js'
import { createPropBag } from './prop-bag.svelte.js'
import Host from './SettingsContainerHost.svelte'

/** Instances mounted during one test, unmounted after it. */
const mounted: Array<ReturnType<typeof mount>> = []

/**
 * Mounts the host with a reactive prop bag and flushes the mount.
 *
 * @param props - The props the host mounts with.
 * @returns The bag a test assigns to, to set a prop (React's `rerender`).
 */
function mountHost(props: ComponentProps<typeof Host>): Record<string, unknown> {
  const target = document.createElement('div')
  document.body.appendChild(target)
  const bag = createPropBag(props)
  mounted.push(mount(Host, { target, props: bag }))
  flushSync()
  return bag
}

/** The consumer's button. */
function closeButton(): HTMLButtonElement {
  const button = document.querySelector('button')
  if (!button) throw new Error('no close button')
  return button as HTMLButtonElement
}

beforeEach(() => {
  resetCaptured()
})

afterEach(async () => {
  for (const instance of mounted.splice(0)) await unmount(instance)
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('<SettingsContainer>', () => {
  it('keeps the context value stable while onClose keeps its identity', () => {
    const onClose = vi.fn()
    const bag = mountHost({ onClose, tick: 0 })
    const first = captured.context
    expect(first).toBeDefined()

    bag.tick = 1
    flushSync()

    // The parent re-rendered; a fresh context value would replace the consumer's.
    expect(document.querySelector('[data-testid="tick"]')?.textContent).toBe('1')
    expect(captured.context).toBe(first)
    closeButton().click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('publishes a new onClose to consumers when the handler changes', () => {
    const first = vi.fn()
    const second = vi.fn()
    const bag = mountHost({ onClose: first })

    bag.onClose = second
    flushSync()

    closeButton().click()
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })
})
