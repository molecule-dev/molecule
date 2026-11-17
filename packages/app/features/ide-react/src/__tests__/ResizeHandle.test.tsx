// @vitest-environment jsdom

/**
 * ResizeHandle's separator value.
 *
 * A focusable `role="separator"` is the WAI-ARIA window-splitter pattern,
 * which requires `aria-valuenow` (axe `aria-required-attr`). The handle
 * reports the leading pane's share of the two panes it divides, so a screen
 * reader announces the split and its changes. The `value` prop drives it.
 *
 * @module
 */

import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ResizeHandle } from '../components/ResizeHandle.js'

beforeEach(() => {
  setClassMap(classMap)
  // The handle's `t` reads the bonded provider outside an I18nProvider.
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  cleanup()
})

/** The rendered separator. */
function separator(container: HTMLElement): HTMLElement {
  const handle = container.querySelector('[role="separator"]')
  if (!handle) throw new Error('missing separator')
  return handle as HTMLElement
}

describe('ResizeHandle separator value (axe aria-required-attr)', () => {
  it('reports the leading pane share as a rounded percentage', () => {
    const { container } = render(<ResizeHandle value={40.4} onResize={vi.fn()} />)
    const handle = separator(container)

    expect(handle.getAttribute('aria-valuenow')).toBe('40')
    expect(handle.getAttribute('aria-valuemin')).toBe('0')
    expect(handle.getAttribute('aria-valuemax')).toBe('100')
  })

  it('follows the value prop when it changes', () => {
    const { container, rerender } = render(<ResizeHandle value={25} onResize={vi.fn()} />)
    const handle = separator(container)
    expect(handle.getAttribute('aria-valuenow')).toBe('25')

    rerender(<ResizeHandle value={62.6} onResize={vi.fn()} />)
    expect(handle.getAttribute('aria-valuenow')).toBe('63')
  })
})
