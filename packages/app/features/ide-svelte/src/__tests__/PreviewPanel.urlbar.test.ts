// @vitest-environment jsdom

/**
 * PV5 — preview URL bar omnibox-quality regression guard.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.urlbar.test.tsx`
 * with the same test names and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync`.
 *
 * The MVP intent audit flagged that the preview URL bar passed the literal
 * Accept but didn't read as a browser omnibox and regressed accessibility: the
 * input stripped its outline with NO focus-within treatment (a WCAG 2.4.7
 * regression below the app's own chat-input standard), and it lacked the
 * signature leading lock/globe site-info glyph and a visually-distinct address
 * field — even though the bonded icon set already ships lock/globe/info.
 *
 * It is a real jsdom render of `PreviewPanel` (not a source grep), pinning:
 *
 *  - the address field renders a leading site-info glyph as a real `<svg>` from
 *    the shared icon set (NOT an emoji string), `lock` for an https location and
 *    `globe` otherwise;
 *  - that glyph is wrapped in the framework's styled `Tooltip` component (a
 *    `role="tooltip"` popover on hover), NOT the delayed native `title` attr,
 *    with i18n text — the same treatment as the toolbar buttons;
 *  - the address field has NO resting border (P4-12) yet still lights up a
 *    primary-token focus RING on focus — never a stripped `outline: none` with
 *    no replacement and never a raw hex literal;
 *  - the input uses a normal (non-monospace) font at 14px, the field stretches
 *    to the full toolbar-row height, and a full-height divider sits to the left
 *    of the nav cluster (P4-12);
 *  - focusing the input selects all its text (omnibox select-all-on-focus).
 *
 * `state.url` is left empty so the polling / iframe / freeze effects all
 * short-circuit (no timers, no network); `state.currentUrl` drives the URL bar's
 * displayed location and the secure/insecure glyph deterministically.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { MountedPanel } from './preview-panel-harness.js'
import { buildPreviewProvider, mountPanel } from './preview-panel-harness.js'

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

beforeEach(() => {
  // The REAL themed ClassMap, so the resolved classes are the actual theme
  // tokens (`bg-surface`, `text-sm`, `items-center`, …).
  setClassMap(classMap)
  // Tag every glyph with its requested name in a path `d`, so the test can prove
  // the site-info glyph resolves to `lock` vs `globe` — and every glyph still
  // renders a real <svg>, never an emoji string.
  setIconSet(
    new Proxy(
      {},
      {
        get: (_target, name) => ({
          paths: [{ d: `glyph:${String(name)}` }],
          viewBox: '0 0 16 16',
        }),
      },
    ),
  )
})

afterEach(async () => {
  await panel?.dispose()
  panel = null
  document.body.innerHTML = ''
})

/**
 * Mounts the panel with no load target but a fixed current location (so the URL
 * bar's address and glyph are deterministic and nothing polls).
 *
 * @param currentUrl - The location the URL bar should reflect.
 * @returns The mounted panel's container.
 */
function mount(currentUrl: string): HTMLElement {
  const mounted = mountPanel(buildPreviewProvider({ url: '', currentUrl, isConnected: false }), {
    isBuilding: false,
  })
  panel = mounted
  flushSync()
  return mounted.container
}

/**
 * Hovers an element the way a user's pointer entering it does (the bubbling
 * `mouseover` the Tooltip wrapper derives its enter from).
 *
 * @param el - The element entered.
 */
function hover(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  flushSync()
}

/**
 * Focuses an element like a user does.
 *
 * @param el - The element focused.
 */
function focus(el: HTMLElement): void {
  el.dispatchEvent(new FocusEvent('focus'))
  flushSync()
}

describe('PreviewPanel URL bar (PV5 — browser-style omnibox)', () => {
  it('renders a real <svg> site-info glyph (never an emoji), lock for https', () => {
    const container = mount('https://app.example.com/dashboard')
    const glyph = container.querySelector('[data-mol-id="preview-site-info"]')
    expect(glyph, 'site-info glyph must render').not.toBeNull()
    expect(glyph?.tagName.toLowerCase(), 'site-info glyph must be a real <svg>').toBe('svg')
    // https → the lock glyph from the shared icon set.
    expect(glyph?.querySelector('path')?.getAttribute('d')).toBe('glyph:lock')
  })

  it('shows the globe glyph for a non-https (e.g. localhost http) location', () => {
    const container = mount('http://localhost:3000/')
    const glyph = container.querySelector('[data-mol-id="preview-site-info"]')
    expect(glyph?.querySelector('path')?.getAttribute('d')).toBe('glyph:globe')
  })

  it('wraps the site-info glyph in the framework Tooltip (not a native title)', () => {
    const container = mount('https://app.example.com/')
    const glyph = container.querySelector('[data-mol-id="preview-site-info"]') as HTMLElement
    // The native `title` is the delayed, unstyled tooltip the audit rejected.
    expect(glyph.hasAttribute('title'), 'site-info glyph must NOT use a native title').toBe(false)
    // The framework Tooltip mounts a `role="tooltip"` popover in a portal on
    // hover of its trigger — a native title produces no such element.
    const trigger = glyph.parentElement as HTMLElement
    hover(trigger)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip, 'site-info glyph must render the styled Tooltip on hover').not.toBeNull()
    // i18n default for the secure state.
    expect(tooltip?.textContent).toBe('Secure (HTTPS)')
    trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
    flushSync()
  })

  it('has no resting border, and shows a primary-token focus ring on focus (P4-12 + WCAG 2.4.7)', () => {
    const container = mount('https://app.example.com/')
    const input = container.querySelector('[data-mol-id="preview-url"]') as HTMLInputElement
    const field = container.querySelector('[data-mol-id="preview-url-field"]') as HTMLElement
    expect(input).not.toBeNull()
    expect(field).not.toBeNull()

    // P4-12: the boxed resting border is GONE — the field declares no `border`
    // shorthand at all (the old `1px solid var(--mol-color-border…)` is removed).
    expect(field.style.border).toBe('')
    // At rest there is no focus ring either.
    expect(field.style.boxShadow).toBe('none')

    // After focus: a primary-token focus RING appears as a box-shadow (NOT a
    // reintroduced border) — the WCAG 2.4.7 indicator the removed border used to
    // provide, driven by a theme token. No bare hex literal stands in for the
    // color (only the var()'s own fallback `#` is allowed).
    focus(input)
    expect(field.style.boxShadow).toContain('var(--mol-color-primary')
    expect(field.style.boxShadow.replace(/var\([^)]*\)/g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    expect(field.style.border, 'the focus indicator must NOT be a reintroduced border').toBe('')
  })

  it('uses a normal (non-monospace) font at 14px, vertically centered (P4-12)', () => {
    const container = mount('https://app.example.com/')
    const input = container.querySelector('[data-mol-id="preview-url"]') as HTMLInputElement
    // Normal font: the monospace family is gone; the input inherits the UI font.
    expect(input.style.fontFamily).toBe('inherit')
    expect(input.style.fontFamily).not.toContain('monospace')
    // 14px via the ClassMap text scale (`text-sm` = 14px), not the old `text-xs` (12px).
    expect(input.className).toContain('text-sm')
    expect(input.className).not.toContain('text-xs')
    // Vertically centered by the field's align-center row.
    const field = container.querySelector('[data-mol-id="preview-url-field"]') as HTMLElement
    expect(field.className).toContain('items-center')
  })

  it('stretches the address field to the full toolbar row height (P4-12)', () => {
    const container = mount('https://app.example.com/')
    const field = container.querySelector('[data-mol-id="preview-url-field"]') as HTMLElement
    expect(field.style.alignSelf).toBe('stretch')
  })

  it('renders a full-height divider to the LEFT of the nav cluster (P4-12)', () => {
    const container = mount('https://app.example.com/')
    const sep = container.querySelector('[data-mol-id="preview-toolbar-separator"]') as HTMLElement
    expect(sep, 'a toolbar separator must render').not.toBeNull()
    // Full height (stretches the row) and a theme-token color, never a hex.
    expect(sep.style.alignSelf).toBe('stretch')
    expect(sep.style.background).toContain('var(--mol-color-border')
    expect(sep.style.background.replace(/var\([^)]*\)/g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    // It sits to the LEFT of the nav cluster: the separator precedes the Back
    // button in DOM order within the toolbar row.
    const back = container.querySelector('[data-mol-id="preview-back"]') as HTMLElement
    expect(back, 'the back button must render').not.toBeNull()
    expect(
      sep.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING,
      'the separator must come before (left of) the back button',
    ).toBeTruthy()
  })

  it('selects all text on focus (omnibox select-all)', () => {
    const container = mount('https://app.example.com/dashboard')
    const input = container.querySelector('[data-mol-id="preview-url"]') as HTMLInputElement
    expect(input.value).toBe('https://app.example.com/dashboard')
    focus(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(input.value.length)
  })

  it('unifies the site-info glyph size with the toolbar buttons (16px)', () => {
    const container = mount('https://app.example.com/')
    const glyph = container.querySelector('[data-mol-id="preview-site-info"]') as SVGElement
    const refreshGlyph = container.querySelector(
      '[data-mol-id="preview-refresh"] svg',
    ) as SVGElement
    expect(glyph.getAttribute('width')).toBe('16')
    expect(glyph.getAttribute('width')).toBe(refreshGlyph.getAttribute('width'))
  })
})
