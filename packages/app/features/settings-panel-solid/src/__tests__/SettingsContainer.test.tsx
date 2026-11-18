// @vitest-environment jsdom

/**
 * Unit tests for the Solid `SettingsContainer` — a port of
 * `@molecule/app-settings-panel-react/src/__tests__/SettingsContainer.test.tsx`:
 * the same context-publishing behaviour, rendered with Solid's browser
 * renderer and observed through a consumer component that reads the
 * container's context.
 *
 * Solid has no component re-render (the component body runs once and updates
 * are fine-grained), so React's `rerender` becomes the port's way of setting
 * a prop — assigning to the signal the host reads — and React's consumer
 * render count becomes the identity of the context value the consumer holds,
 * which Solid's provider keeps across a parent update.
 *
 * @module
 */

import { createSignal, type JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { useSettingsPanelContext } from '../context.js'
import { SettingsContainer } from '../SettingsContainer.jsx'
import type { SettingsPanelContextValue } from '../types.js'

/** The context value the consumer last read from the container. */
let consumerContext: SettingsPanelContextValue | undefined

/**
 * A consumer that records the context it is given and calls the published
 * handler on click.
 *
 * @returns The consumer element.
 */
function Consumer(): JSX.Element {
  consumerContext = useSettingsPanelContext()
  return (
    <button type="button" onClick={() => consumerContext?.onClose()}>
      close
    </button>
  )
}

/** Renderers to dispose after each test. */
const disposers: Array<() => void> = []

/**
 * Mounts a host whose render hands the container the current handler from a
 * signal and re-renders an unrelated node when that signal changes — Solid's
 * way of setting a prop on the parent (React's `rerender`).
 *
 * @param onClose - The initial dismiss handler.
 * @returns The setters and the mounted host element.
 */
function mountHost(onClose: () => void): {
  setHandler: (next: () => void) => void
  rerender: () => void
  host: HTMLElement
} {
  const [handler, setHandler] = createSignal<() => void>(onClose)
  const [tick, setTick] = createSignal(0)
  const Host = (): JSX.Element => (
    <div>
      <SettingsContainer onClose={handler()}>
        <Consumer />
      </SettingsContainer>
      <span data-testid="tick">{tick()}</span>
    </div>
  )
  const container = document.createElement('div')
  document.body.appendChild(container)
  const dispose = render(Host, container)
  disposers.push(() => {
    dispose()
    container.remove()
  })
  return {
    // A function value in a signal is an updater, so the setter returns it.
    setHandler: (next: () => void) => setHandler(() => next),
    rerender: () => setTick((value) => value + 1),
    host: container,
  }
}

beforeEach(() => {
  setClassMap(classMap)
  consumerContext = undefined
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose()
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('<SettingsContainer>', () => {
  it('keeps the context value stable while onClose keeps its identity', () => {
    const onClose = vi.fn()
    const view = mountHost(onClose)
    const first = consumerContext
    expect(first).toBeDefined()

    view.rerender()

    // The parent re-rendered; a fresh context value would replace the consumer's.
    expect(view.host.querySelector('[data-testid="tick"]')?.textContent).toBe('1')
    expect(consumerContext).toBe(first)
    view.host.querySelector('button')?.click()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('publishes a new onClose to consumers when the handler changes', () => {
    const first = vi.fn()
    const second = vi.fn()
    const view = mountHost(first)

    view.setHandler(second)

    view.host.querySelector('button')?.click()
    expect(second).toHaveBeenCalledTimes(1)
    expect(first).not.toHaveBeenCalled()
  })
})
