// @vitest-environment jsdom

/**
 * TabBar close-control focus reveal (WCAG 2.4.7 Focus Visible).
 *
 * The tab's close control used to reveal on hover ONLY: a keyboard user who
 * tabbed to the tab — or on to the close control itself — never saw the
 * control they could act on, and the control's hover tint was mouse-only too.
 * The fix reveals the control while focus is anywhere inside the tab
 * (`onFocus` sets it; `onBlur` clears it only when focus leaves the tab) and
 * lights the control's tint on its own focus as well.
 *
 * The events are dispatched exactly the way the conformance kit's `focus` and
 * `blur` steps are: the native `focus()`/`blur()` plus the bubbling
 * `focusin`/`focusout` pair React derives its (bubbling) synthetic
 * `onFocus`/`onBlur` from. A revert to the mouse-only reveal fails here.
 *
 * @module
 */

import { act, cleanup, fireEvent, render } from '@testing-library/react'
import type { JSX, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { TabBar } from '../components/TabBar.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A TypeScript file the bar opens first. */
const APP = '/workspace/src/app.ts'
/** A Markdown file opened next to it (its close control must stay hidden). */
const README = '/workspace/README.md'

/** The tint the close control lights with on hover — and now on focus (the CSSOM's serialization). */
const FOCUS_TINT = 'rgba(128, 128, 128, 0.25)'

/** A minimal light theme so `useThemeMode` (TabBar's styling hook) resolves. */

/** Wrap children in the theme context (the i18n side rides the bonded provider). */
function wrap(children: ReactNode): JSX.Element {
  return <ThemeProvider provider={buildThemeProvider()}>{children}</ThemeProvider>
}

/**
 * Focuses an element the way the conformance kit's `focus` step does: the
 * native `focus()` plus the bubbling `focusin` pair.
 * @param el - The element to focus.
 */
function focusEl(el: HTMLElement): void {
  act(() => {
    el.focus()
    el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
  })
}

/**
 * Blurs an element the way the conformance kit's `blur` step does.
 * @param el - The element to blur.
 */
function blurEl(el: HTMLElement): void {
  act(() => {
    el.blur()
    el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

/**
 * Renders a two-tab bar and hands back the first tab, its close control, the
 * second tab's close control and the selection/close spies.
 * @returns The rendered bar's key elements and spies.
 */
function renderBar(): {
  firstTab: HTMLElement
  firstClose: HTMLElement
  secondClose: HTMLElement
  onSelect: ReturnType<typeof vi.fn>
  onClose: ReturnType<typeof vi.fn>
} {
  const onSelect = vi.fn()
  const onClose = vi.fn()
  const { container } = render(
    wrap(
      <TabBar
        tabs={[
          { path: APP, label: 'app.ts', isDirty: false, isActive: false },
          { path: README, label: 'README.md', isDirty: false, isActive: false },
        ]}
        activeFile={null}
        onSelect={onSelect}
        onClose={onClose}
      />,
    ),
  )
  const firstTab = container.querySelector('div[role="tab"]') as HTMLElement
  const closes = container.querySelectorAll('[data-mol-id="tab-close"]')
  return {
    firstTab,
    firstClose: closes[0] as HTMLElement,
    secondClose: closes[1] as HTMLElement,
    onSelect,
    onClose,
  }
}

beforeEach(() => {
  // jsdom has no scrollIntoView; the bar scrolls the active tab into view.
  Element.prototype.scrollIntoView = (): void => {}
  setClassMap(classMap)
  // TabBar's `t` (outside an I18nProvider) reads the bonded provider.
  setProvider(
    createSimpleI18nProvider('en', [
      {
        code: 'en',
        name: 'English',
        translations: { 'ide.tabs.close': 'Close {{fileName}}' },
      },
    ]),
  )
})

afterEach(() => {
  cleanup()
})

describe('TabBar close-control focus reveal (WCAG 2.4.7)', () => {
  it('focusing a tab reveals its close button', () => {
    const { firstTab, firstClose, secondClose } = renderBar()

    // Pointer devices start with the close control hidden on every tab.
    expect(firstClose.style.opacity).toBe('0')
    expect(secondClose.style.opacity).toBe('0')

    focusEl(firstTab)
    expect(firstClose.style.opacity).toBe('1')
    // Only the focused tab's control reveals — the sibling stays hidden.
    expect(secondClose.style.opacity).toBe('0')
  })

  it('focus moving from the tab to its close button keeps it revealed', () => {
    const { firstTab, firstClose } = renderBar()

    focusEl(firstTab)
    expect(firstClose.style.opacity).toBe('1')

    // The move is one focused region: the control stays revealed…
    focusEl(firstClose)
    expect(firstClose.style.opacity).toBe('1')
    // …and lights its tint, the keyboard twin of its hover tint.
    expect(firstClose.style.background).toBe(FOCUS_TINT)
    expect(firstClose.style.color).toBe('var(--color-foreground, #e0e0e0)')
  })

  it('blur hides it again', () => {
    const { firstTab, firstClose } = renderBar()

    focusEl(firstTab)
    expect(firstClose.style.opacity).toBe('1')

    blurEl(firstTab)
    expect(firstClose.style.opacity).toBe('0')
  })
})

describe('TabBar tab semantics (axe nested-interactive)', () => {
  it('keeps the close button outside the role="tab" element', () => {
    const { firstTab, firstClose } = renderBar()

    // A tab's children are presentational, so a close button inside it would
    // vanish from the accessibility tree (axe nested-interactive).
    expect(firstTab.querySelector('[data-mol-id="tab-close"]')).toBeNull()
    // The close control is the tab's sibling, under the presentation wrapper.
    expect(firstClose.parentElement).toBe(firstTab.parentElement)
    expect(firstClose.parentElement?.getAttribute('role')).toBe('presentation')
    // The keyboard path is Delete on the tab, so the button is out of the order.
    expect(firstClose.tabIndex).toBe(-1)
    // A tablist may own only tabs, so the ✕ is the pointer-user duplicate of
    // the tab's Delete action and is hidden from the accessibility tree.
    expect(firstClose.getAttribute('aria-hidden')).toBe('true')
    expect(firstTab.getAttribute('aria-keyshortcuts')).toBe('Delete')
  })

  it('closes the focused tab on Delete', () => {
    const { firstTab, onClose, onSelect } = renderBar()

    fireEvent.keyDown(firstTab, { key: 'Delete' })

    expect(onClose).toHaveBeenCalledWith(APP)
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('selects the focused tab on Enter and Space', () => {
    const { firstTab, onSelect } = renderBar()

    fireEvent.keyDown(firstTab, { key: 'Enter' })
    fireEvent.keyDown(firstTab, { key: ' ' })

    expect(onSelect).toHaveBeenCalledTimes(2)
    expect(onSelect).toHaveBeenCalledWith(APP)
  })
})
