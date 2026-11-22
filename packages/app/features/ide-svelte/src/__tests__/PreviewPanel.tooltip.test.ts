// @vitest-environment jsdom

/**
 * IDE1 / "obvious on hover" — preview-toolbar tooltip-quality regression guard.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.tooltip.test.tsx`
 * with the same test names and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync`.
 *
 * The MVP intent audit flagged that "obvious on hover" was met only literally:
 * every preview/IDE affordance used the delayed, unstyled, touch-blind native
 * `title` attribute while the framework's REAL styled `Tooltip` shipped but was
 * imported NOWHERE. This guard pins the foundation fix on the reference surface
 * (the preview toolbar): every control must render the framework `Tooltip`
 * component — instant, themed via ClassMap tokens, focus/hover-aware — and NEVER
 * the native `title` attribute.
 *
 * It is a real jsdom render of `PreviewPanel` (not a source grep), with the REAL
 * `@molecule/app-ui-tailwind` ClassMap so the tooltip's resolved classes are the
 * actual themed tokens. With the panel given no preview URL, all the polling /
 * iframe / freeze effects short-circuit, so the always-visible toolbar renders
 * deterministically without timers or network.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import type { MountedPanel } from './preview-panel-harness.js'
import { buildPreviewProvider, mountPanel, q } from './preview-panel-harness.js'

/**
 * Every always-visible preview-toolbar control, with the i18n default text its
 * tooltip must show. `preview-device-cycle` is the DeviceFrameSelector dropdown
 * trigger; the rest are BarButtons. The "Rotate" and "Open in new tab" controls
 * are NOT listed here: they moved INTO the device-frame dropdown (P4-04), where
 * they render as plain menu-item rows (no Tooltip) — covered by
 * DeviceFrameSelector.test.ts.
 */
const PREVIEW_CONTROLS: ReadonlyArray<{ id: string; tip: string }> = [
  { id: 'preview-device-cycle', tip: 'Device frame' },
  { id: 'preview-back', tip: 'Back' },
  { id: 'preview-forward', tip: 'Forward' },
  { id: 'preview-refresh', tip: 'Refresh preview' },
]

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

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
 * Unhovers an element the way a user's pointer leaving it does.
 *
 * @param el - The element left.
 */
function unhover(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  flushSync()
}

/**
 * Clicks an element with a bubbling click (a disabled control still receives a
 * synthesized click event, which is what React's `fireEvent.click` dispatches).
 *
 * @param el - The element clicked.
 */
function click(el: HTMLElement): void {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  flushSync()
}

/** The tooltip box currently mounted in the body portal, if any. */
function tooltip(): Element | null {
  return document.body.querySelector('[role="tooltip"]')
}

beforeEach(() => {
  // The REAL themed ClassMap — so the tooltip's resolved classes are the actual
  // theme tokens (not a stub), which is what the "no hardcoded hex" check needs.
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon only needs a defined entry and
  // still renders a real <svg> (never an emoji string).
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(async () => {
  // Unmount the proper way so the Tooltip's portal nodes are removed by Svelte.
  await panel?.dispose()
  panel = null
})

/**
 * Mounts the panel with no preview URL (the toolbar only), the way the React
 * test does.
 *
 * @returns The mounted panel.
 */
function mount(): MountedPanel {
  const mounted = mountPanel(
    buildPreviewProvider({ url: '', currentUrl: '', isConnected: false }),
    { isBuilding: false },
  )
  panel = mounted
  return mounted
}

describe('PreviewPanel tooltips (IDE1 — real styled Tooltip, not native title)', () => {
  it('renders NO native `title` attribute on any preview control', () => {
    const { container } = mount()
    for (const { id } of PREVIEW_CONTROLS) {
      const el = q(container, id)
      expect(el, `${id} should render`).not.toBeNull()
      // The native `title` is the delayed, unstyled, touch-blind tooltip the
      // audit rejected — it must be gone entirely.
      expect(el?.hasAttribute('title'), `${id} must NOT use the native title attr`).toBe(false)
    }
  })

  it('renders the framework Tooltip component on hover for every control', async () => {
    const { container } = mount()
    for (const { id, tip } of PREVIEW_CONTROLS) {
      const el = q(container, id) as HTMLElement
      // The framework Tooltip wraps its child in a trigger element; hovering it
      // mounts a `role="tooltip"` popover in a portal. A native `title` produces
      // no such element, so this only passes with the real component wired.
      const trigger = el.parentElement as HTMLElement
      hover(trigger)
      const shown = tooltip()
      expect(shown, `${id} must render the styled Tooltip on hover`).not.toBeNull()
      expect(shown?.textContent, `${id} tooltip text comes through i18n t()`).toBe(tip)
      unhover(trigger)
      await vi.waitFor(() => expect(tooltip()).toBeNull())
    }
  })

  it('hides the tooltip when the control is clicked (P5-02)', () => {
    const { container } = mount()
    for (const { id } of PREVIEW_CONTROLS) {
      const el = q(container, id) as HTMLElement
      const trigger = el.parentElement as HTMLElement
      // Hover mounts the tooltip…
      hover(trigger)
      expect(tooltip(), `${id} tooltip should show on hover`).not.toBeNull()
      // …and clicking the control must hide it again — a click shouldn't leave a
      // tooltip lingering over the button the user just pressed.
      click(el)
      expect(tooltip(), `${id} tooltip must be hidden after the control is clicked`).toBeNull()
    }
  })

  it('themes the tooltip via ClassMap tokens, never a hardcoded hex color', () => {
    const { container } = mount()
    const refresh = q(container, 'preview-refresh') as HTMLElement
    hover(refresh.parentElement as HTMLElement)
    const shown = tooltip() as HTMLElement | null
    expect(shown).not.toBeNull()
    const className = shown?.className ?? ''
    // Surface + foreground come from theme tokens (light/dark aware), not hex.
    expect(className, 'tooltip surface must be a theme token').toContain('bg-surface')
    expect(className, 'tooltip text must be a theme token').toContain('text-foreground')
    // No raw hex literal anywhere in the resolved class string.
    expect(className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('renders a real SVG icon (never an emoji glyph) inside every control', () => {
    const { container } = mount()
    for (const { id } of PREVIEW_CONTROLS) {
      const el = q(container, id) as HTMLElement
      expect(
        el.querySelector('svg'),
        `${id} must render an <svg> icon, not an emoji`,
      ).not.toBeNull()
    }
  })
})
