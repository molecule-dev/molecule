// @vitest-environment jsdom
/**
 * ResizeHandle's separator value — a port of
 * `@molecule/app-ide-react/src/__tests__/ResizeHandle.test.tsx` with the same
 * test names and the same assertions, mounted as a real Solid root.
 *
 * A focusable `role="separator"` is the WAI-ARIA window-splitter pattern,
 * which requires `aria-valuenow` (axe `aria-required-attr`). The handle
 * reports the leading pane's share of the two panes it divides, so a screen
 * reader announces the split and its changes. The `value` prop drives it.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { createSignal } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ResizeHandle } from '../components/ResizeHandle.jsx'

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
})

/**
 * The rendered separator.
 * @param container - The render container.
 * @returns The separator element.
 */
function separator(container: HTMLElement): HTMLElement {
  const handle = container.querySelector('[role="separator"]')
  if (!handle) throw new Error('missing separator')
  return handle as HTMLElement
}

/**
 * Renders the handle over a value the test can replace without a remount.
 * @param value - The initial leading-pane share.
 * @returns The container and the setter for the value prop.
 */
function renderHandle(value: number): {
  container: HTMLElement
  setValue: (next: number) => void
} {
  const [share, setShare] = createSignal(value)
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(() => <ResizeHandle value={share()} onResize={vi.fn()} />, container)
  return { container, setValue: setShare }
}

describe('ResizeHandle separator value (axe aria-required-attr)', () => {
  it('reports the leading pane share as a rounded percentage', () => {
    const { container } = renderHandle(40.4)
    const handle = separator(container)

    expect(handle.getAttribute('aria-valuenow')).toBe('40')
    expect(handle.getAttribute('aria-valuemin')).toBe('0')
    expect(handle.getAttribute('aria-valuemax')).toBe('100')
  })

  it('follows the value prop when it changes', () => {
    const { container, setValue } = renderHandle(25)
    const handle = separator(container)
    expect(handle.getAttribute('aria-valuenow')).toBe('25')

    setValue(62.6)
    expect(handle.getAttribute('aria-valuenow')).toBe('63')
  })
})
