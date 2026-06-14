// @vitest-environment jsdom

/**
 * PV5 — preview URL bar omnibox-quality regression guard.
 *
 * The MVP intent audit flagged that the preview URL bar passed the literal
 * Accept but didn't read as a browser omnibox and regressed accessibility: the
 * input stripped its outline with NO focus-within treatment (a WCAG 2.4.7
 * regression below the app's own chat-input standard), and it lacked the
 * signature leading lock/globe site-info glyph and a visually-distinct address
 * field — even though the bonded icon set already ships lock/globe/info.
 *
 * This is a real jsdom render of {@link PreviewPanel} (not a source grep). It
 * pins the quality so a revert can't pass:
 *
 *  - the address field renders a leading site-info glyph as a real `<svg>` from
 *    the shared icon set (NOT an emoji string), `lock` for an https location and
 *    `globe` otherwise;
 *  - that glyph is wrapped in the framework's styled `Tooltip` component (a
 *    `role="tooltip"` popover on hover), NOT the delayed native `title` attr,
 *    with i18n text — the same treatment as the toolbar buttons;
 *  - focusing the input lights up the address field's focus ring in the primary
 *    theme TOKEN (`var(--mol-color-primary…)`), never a stripped `outline: none`
 *    with no replacement and never a raw hex literal;
 *  - focusing the input selects all its text (omnibox select-all-on-focus).
 *
 * `state.url` is left empty so the polling / iframe / freeze effects all
 * short-circuit (no timers, no network); `state.currentUrl` drives the URL bar's
 * displayed location and the secure/insecure glyph deterministically.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { I18nProvider, PreviewProvider as PreviewContextProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { PreviewPanel } from '../components/PreviewPanel.js'

/**
 * A minimal {@link PreviewProvider} with no active load target (so the polling /
 * iframe / watchdog effects early-return) but a fixed `currentUrl` that drives
 * the URL bar's displayed address and its secure/insecure site-info glyph.
 * @param currentUrl - The location the URL bar should reflect.
 * @returns A stub PreviewProvider.
 */
function buildStubPreviewProvider(currentUrl: string): PreviewProvider {
  const state: PreviewState = {
    url: '',
    currentUrl,
    isLoading: false,
    device: 'none',
    error: null,
    isConnected: false,
    canGoBack: false,
    canGoForward: false,
    loadNonce: 0,
  }
  const noop = (): void => {}
  return {
    name: 'stub',
    setUrl: noop,
    getUrl: () => state.url,
    refresh: noop,
    setDevice: (_device: DeviceFrame) => {},
    getState: () => state,
    navigateTo: noop,
    recordNavigation: noop,
    back: noop,
    forward: noop,
    canGoBack: () => false,
    canGoForward: () => false,
    subscribe: () => () => {},
    openExternal: noop,
  }
}

/**
 * Wrap children with the i18n + preview context PreviewPanel needs.
 * @param props - Wrapper props.
 * @param props.children - Children to wrap.
 * @param props.currentUrl - The preview's current location.
 * @returns The wrapped tree.
 */
function Wrap({ children, currentUrl }: { children: ReactNode; currentUrl: string }): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <PreviewContextProvider provider={buildStubPreviewProvider(currentUrl)}>
        {children}
      </PreviewContextProvider>
    </I18nProvider>
  )
}

beforeEach(() => {
  // The REAL themed ClassMap, so the resolved classes are the actual theme
  // tokens (`bg-surface`, `text-muted-foreground`, …) — what the "distinct,
  // token-driven, no hardcoded hex" assertions need.
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

afterEach(() => {
  cleanup()
})

describe('PreviewPanel URL bar (PV5 — browser-style omnibox)', () => {
  it('renders a real <svg> site-info glyph (never an emoji), lock for https', () => {
    const { container } = render(
      <Wrap currentUrl="https://app.example.com/dashboard">
        <PreviewPanel />
      </Wrap>,
    )
    const glyph = container.querySelector('[data-mol-id="preview-site-info"]')
    expect(glyph, 'site-info glyph must render').not.toBeNull()
    expect(glyph?.tagName.toLowerCase(), 'site-info glyph must be a real <svg>').toBe('svg')
    // https → the lock glyph from the shared icon set.
    expect(glyph?.querySelector('path')?.getAttribute('d')).toBe('glyph:lock')
  })

  it('shows the globe glyph for a non-https (e.g. localhost http) location', () => {
    const { container } = render(
      <Wrap currentUrl="http://localhost:3000/">
        <PreviewPanel />
      </Wrap>,
    )
    const glyph = container.querySelector('[data-mol-id="preview-site-info"]')
    expect(glyph?.querySelector('path')?.getAttribute('d')).toBe('glyph:globe')
  })

  it('wraps the site-info glyph in the framework Tooltip (not a native title)', () => {
    const { container } = render(
      <Wrap currentUrl="https://app.example.com/">
        <PreviewPanel />
      </Wrap>,
    )
    const glyph = container.querySelector('[data-mol-id="preview-site-info"]') as HTMLElement
    // The native `title` is the delayed, unstyled tooltip the audit rejected.
    expect(glyph.hasAttribute('title'), 'site-info glyph must NOT use a native title').toBe(false)
    // The framework Tooltip mounts a `role="tooltip"` popover in a portal on
    // hover of its trigger — a native title produces no such element.
    const trigger = glyph.parentElement as HTMLElement
    fireEvent.mouseEnter(trigger)
    const tooltip = document.body.querySelector('[role="tooltip"]')
    expect(tooltip, 'site-info glyph must render the styled Tooltip on hover').not.toBeNull()
    // i18n default for the secure state.
    expect(tooltip?.textContent).toBe('Secure (HTTPS)')
    fireEvent.mouseLeave(trigger)
  })

  it('lights up a focus ring in the primary theme token on focus (WCAG 2.4.7)', () => {
    const { container } = render(
      <Wrap currentUrl="https://app.example.com/">
        <PreviewPanel />
      </Wrap>,
    )
    const input = container.querySelector('[data-mol-id="preview-url"]') as HTMLInputElement
    const field = container.querySelector('[data-mol-id="preview-url-field"]') as HTMLElement
    expect(input).not.toBeNull()
    expect(field).not.toBeNull()

    // Before focus: the resting border is the muted border token, NOT the
    // primary focus color.
    expect(field.style.border).toContain('var(--mol-color-border')
    expect(field.style.border).not.toContain('--mol-color-primary')

    // After focus: the address field's border becomes the primary theme TOKEN —
    // a visible focus indicator driven by a token, never a stripped outline and
    // never a raw hex literal. This is what makes the WCAG 2.4.7 regression
    // (bare `outline: none` with no replacement) impossible to reintroduce.
    fireEvent.focus(input)
    expect(field.style.border).toContain('var(--mol-color-primary')
    // The token reference is the color source — no bare hex literal stands in
    // for the theme color (the only `#` allowed is the var()'s own fallback).
    expect(field.style.border.replace(/var\([^)]*\)/g, '')).not.toMatch(/#[0-9a-fA-F]{3,8}/)
  })

  it('selects all text on focus (omnibox select-all)', () => {
    const { container } = render(
      <Wrap currentUrl="https://app.example.com/dashboard">
        <PreviewPanel />
      </Wrap>,
    )
    const input = container.querySelector('[data-mol-id="preview-url"]') as HTMLInputElement
    expect(input.value).toBe('https://app.example.com/dashboard')
    fireEvent.focus(input)
    expect(input.selectionStart).toBe(0)
    expect(input.selectionEnd).toBe(input.value.length)
  })

  it('unifies the site-info glyph size with the toolbar buttons (16px)', () => {
    const { container } = render(
      <Wrap currentUrl="https://app.example.com/">
        <PreviewPanel />
      </Wrap>,
    )
    const glyph = container.querySelector('[data-mol-id="preview-site-info"]') as SVGElement
    const refreshGlyph = container.querySelector(
      '[data-mol-id="preview-refresh"] svg',
    ) as SVGElement
    expect(glyph.getAttribute('width')).toBe('16')
    expect(glyph.getAttribute('width')).toBe(refreshGlyph.getAttribute('width'))
  })
})
