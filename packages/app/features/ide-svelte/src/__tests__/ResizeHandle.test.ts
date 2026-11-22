// @vitest-environment jsdom

/**
 * ResizeHandle's separator value.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/ResizeHandle.test.tsx` with
 * the same test names and the same assertions, mounted through Svelte 5's own
 * `mount`/`flushSync`.
 *
 * A focusable `role="separator"` is the WAI-ARIA window-splitter pattern,
 * which requires `aria-valuenow` (axe `aria-required-attr`). The handle
 * reports the leading pane's share of the two panes it divides, so a screen
 * reader announces the split and its changes. The `value` prop drives it.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import ResizeHandleHost from './ResizeHandleHost.svelte'

/** Tears down the mount alive right now, if any. */
let teardown: (() => Promise<void>) | null = null
let container: HTMLElement | null = null

beforeEach(() => {
  setClassMap(classMap)
  // The handle's `t` reads the bonded provider outside an I18nProvider.
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  if (teardown) await teardown()
  teardown = null
  container?.remove()
  container = null
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Renders the handle at a value.
 *
 * @param value - The leading pane's share.
 * @returns The container and a prop replacer.
 */
function render(value: number): { container: HTMLElement; setProps: (next: number) => void } {
  document.body.innerHTML = ''
  container = document.createElement('div')
  document.body.appendChild(container)
  const onResize = vi.fn()
  const mounted = mount(ResizeHandleHost, {
    target: container,
    props: { initial: { value, onResize } },
  })
  teardown = () => unmount(mounted)
  flushSync()
  return {
    container,
    setProps: (next: number): void => {
      mounted.setProps({ value: next, onResize })
      flushSync()
    },
  }
}

/** The rendered separator. */
function separator(el: HTMLElement): HTMLElement {
  const handle = el.querySelector('[role="separator"]')
  if (!handle) throw new Error('missing separator')
  return handle as HTMLElement
}

describe('ResizeHandle separator value (axe aria-required-attr)', () => {
  it('reports the leading pane share as a rounded percentage', () => {
    const { container: host } = render(40.4)
    const handle = separator(host)

    expect(handle.getAttribute('aria-valuenow')).toBe('40')
    expect(handle.getAttribute('aria-valuemin')).toBe('0')
    expect(handle.getAttribute('aria-valuemax')).toBe('100')
  })

  it('follows the value prop when it changes', () => {
    const { container: host, setProps } = render(25)
    const handle = separator(host)
    expect(handle.getAttribute('aria-valuenow')).toBe('25')

    setProps(62.6)
    expect(handle.getAttribute('aria-valuenow')).toBe('63')
  })
})
