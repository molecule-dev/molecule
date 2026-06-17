// @vitest-environment jsdom

/**
 * IDE1 / "obvious on hover" — preview-toolbar tooltip-quality regression guard.
 *
 * The MVP intent audit flagged that "obvious on hover" was met only literally:
 * every preview/IDE affordance used the delayed, unstyled, touch-blind native
 * `title` attribute while the framework's REAL styled `Tooltip` shipped but was
 * imported NOWHERE. This guard pins the foundation fix on the reference surface
 * (the preview toolbar): every control must render the framework `Tooltip`
 * component — instant, themed via ClassMap tokens, focus/hover-aware — and NEVER
 * the native `title` attribute.
 *
 * This is a real jsdom render of {@link PreviewPanel} (not a source grep). It uses
 * the REAL `@molecule/app-ui-tailwind` ClassMap so the tooltip's resolved classes
 * are the actual themed tokens, which lets the "themed, not hardcoded hex"
 * assertion bite. With the panel given no preview URL, all the polling / iframe /
 * freeze effects short-circuit, so the always-visible toolbar renders
 * deterministically without timers or network.
 *
 * The test would fail if anyone reverted a control to a native `title` attribute
 * (no `role="tooltip"` element appears, and a `title` attr reappears), swapped the
 * SVG glyph for an emoji string (no `<svg>` child), or hardcoded a hex color into
 * the tooltip instead of a ClassMap theme token.
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
 * A minimal {@link PreviewProvider} with no active preview, so PreviewPanel's
 * polling / iframe / watchdog effects all early-return and only the toolbar
 * renders.
 * @returns A stub PreviewProvider.
 */
function buildStubPreviewProvider(): PreviewProvider {
  const state: PreviewState = {
    url: '',
    currentUrl: '',
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
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <PreviewContextProvider provider={buildStubPreviewProvider()}>
        {children}
      </PreviewContextProvider>
    </I18nProvider>
  )
}

beforeEach(() => {
  // The REAL themed ClassMap — so the tooltip's resolved classes are the actual
  // theme tokens (not a stub), which is what the "no hardcoded hex" check needs.
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon only needs a defined entry and
  // still renders a real <svg> (never an emoji string).
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(() => {
  // Unmount the React tree the proper way so the Tooltip's portal nodes are
  // removed by React itself. Nuking `document.body.innerHTML` instead races
  // React's portal unmount ("node to be removed is not a child of this node").
  cleanup()
})

/**
 * Every always-visible preview-toolbar control, with the i18n default text its
 * tooltip must show. `preview-device-cycle` is the DeviceFrameSelector dropdown
 * trigger; the rest are BarButtons. The "Rotate" and "Open in new tab" controls
 * are NOT listed here: they moved INTO the device-frame dropdown (P4-04), where
 * they render as plain menu-item rows (no Tooltip) — covered by
 * DeviceFrameSelector.test.tsx. (Rotate also only applies to fixed-frame devices;
 * the stub state is `none`.)
 */
const PREVIEW_CONTROLS: ReadonlyArray<{ id: string; tip: string }> = [
  { id: 'preview-device-cycle', tip: 'Device frame' },
  { id: 'preview-back', tip: 'Back' },
  { id: 'preview-forward', tip: 'Forward' },
  { id: 'preview-refresh', tip: 'Reload' },
]

describe('PreviewPanel tooltips (IDE1 — real styled Tooltip, not native title)', () => {
  it('renders NO native `title` attribute on any preview control', () => {
    const { container } = render(
      <Wrap>
        <PreviewPanel />
      </Wrap>,
    )
    for (const { id } of PREVIEW_CONTROLS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`)
      expect(el, `${id} should render`).not.toBeNull()
      // The native `title` is the delayed, unstyled, touch-blind tooltip the
      // audit rejected — it must be gone entirely.
      expect(el?.hasAttribute('title'), `${id} must NOT use the native title attr`).toBe(false)
    }
  })

  it('renders the framework Tooltip component on hover for every control', () => {
    const { container } = render(
      <Wrap>
        <PreviewPanel />
      </Wrap>,
    )
    for (const { id, tip } of PREVIEW_CONTROLS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`) as HTMLElement
      // The framework Tooltip wraps its child in a trigger element; hovering it
      // mounts a `role="tooltip"` popover in a portal. A native `title` produces
      // no such element, so this only passes with the real component wired.
      const trigger = el.parentElement as HTMLElement
      fireEvent.mouseEnter(trigger)
      const tooltip = document.body.querySelector('[role="tooltip"]')
      expect(tooltip, `${id} must render the styled Tooltip on hover`).not.toBeNull()
      expect(tooltip?.textContent, `${id} tooltip text comes through i18n t()`).toBe(tip)
      fireEvent.mouseLeave(trigger)
    }
  })

  it('themes the tooltip via ClassMap tokens, never a hardcoded hex color', () => {
    const { container } = render(
      <Wrap>
        <PreviewPanel />
      </Wrap>,
    )
    const refresh = container.querySelector('[data-mol-id="preview-refresh"]') as HTMLElement
    fireEvent.mouseEnter(refresh.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]') as HTMLElement
    expect(tooltip).not.toBeNull()
    const className = tooltip.className
    // Surface + foreground come from theme tokens (light/dark aware), not hex.
    expect(className, 'tooltip surface must be a theme token').toContain('bg-surface')
    expect(className, 'tooltip text must be a theme token').toContain('text-foreground')
    // No raw hex literal anywhere in the resolved class string.
    expect(className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('renders a real SVG icon (never an emoji glyph) inside every control', () => {
    const { container } = render(
      <Wrap>
        <PreviewPanel />
      </Wrap>,
    )
    for (const { id } of PREVIEW_CONTROLS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`) as HTMLElement
      expect(
        el.querySelector('svg'),
        `${id} must render an <svg> icon, not an emoji`,
      ).not.toBeNull()
    }
  })
})
