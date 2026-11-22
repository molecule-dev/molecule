// @vitest-environment jsdom

/**
 * ResizeHandle's separator value.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/ResizeHandle.test.tsx` with the
 * same test names and the same assertions, mounted through Vue's own `createApp`.
 *
 * A focusable `role="separator"` is the WAI-ARIA window-splitter pattern, which
 * requires `aria-valuenow` (axe `aria-required-attr`). The handle reports the
 * leading pane's share of the two panes it divides, so a screen reader announces
 * the split and its changes. The `value` prop drives it.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ResizeHandle } from '../components/ResizeHandle.js'

/** The app and host this file last mounted, torn down before the next render. */
const mounted: { app?: ReturnType<typeof createApp>; host?: HTMLElement } = {}

/**
 * Mounts a handle over a reactive `value`.
 *
 * @param value - The first value.
 * @returns The mount host and the reactive value box.
 */
function mount(value: number): { container: HTMLElement; box: { value: number } } {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  mounted.host = host
  const box = reactive({ value })
  const app = createApp({
    render: (): VNodeChild => h(ResizeHandle, { value: box.value, onResize: vi.fn() }),
  })
  mounted.app = app
  app.mount(host)
  return { container: host, box }
}

beforeEach(() => {
  setClassMap(classMap)
  // The handle's `t` reads the bonded provider outside an I18nProvider.
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  mounted.host?.remove()
  mounted.host = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * The rendered separator.
 *
 * @param container - The mount host.
 * @returns The separator element.
 */
function separator(container: HTMLElement): HTMLElement {
  const handle = container.querySelector('[role="separator"]')
  if (!handle) throw new Error('missing separator')
  return handle as HTMLElement
}

describe('ResizeHandle separator value (axe aria-required-attr)', () => {
  it('reports the leading pane share as a rounded percentage', () => {
    const { container } = mount(40.4)
    const handle = separator(container)

    expect(handle.getAttribute('aria-valuenow')).toBe('40')
    expect(handle.getAttribute('aria-valuemin')).toBe('0')
    expect(handle.getAttribute('aria-valuemax')).toBe('100')
  })

  it('follows the value prop when it changes', async () => {
    const { container, box } = mount(25)
    const handle = separator(container)
    expect(handle.getAttribute('aria-valuenow')).toBe('25')

    box.value = 62.6
    await nextTick()
    expect(handle.getAttribute('aria-valuenow')).toBe('63')
  })
})
