// @vitest-environment jsdom

/**
 * IDE1 / "obvious on hover" — preview-toolbar tooltip-quality regression guard.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.tooltip.test.tsx`
 * with the same test names and the same assertions: the Vue panel is a view over
 * the same shared behaviour, and its toolbar must render the framework's REAL
 * styled `Tooltip` — instant, themed via ClassMap tokens, focus/hover-aware —
 * never the delayed, unstyled, touch-blind native `title` attribute.
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

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'

import { setIconSet } from '@molecule/app-icons'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { delay, type MountedPanel, mountPanel, q } from './preview-panel-harness.js'

/**
 * A minimal {@link PreviewProvider} with no active preview, so PreviewPanel's
 * polling / iframe / watchdog effects all early-return and only the toolbar
 * renders.
 *
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

/** The panels this file mounted, unmounted after each test. */
const mounted: MountedPanel[] = []

/**
 * Mounts the panel over the no-preview stub.
 *
 * @returns The mounted panel.
 */
function mount(): MountedPanel {
  const panel = mountPanel(buildStubPreviewProvider())
  mounted.push(panel)
  return panel
}

/**
 * Hovers a control's Tooltip trigger and flushes the tooltip's mount render.
 *
 * @param el - The control element (the tooltip wraps it in a trigger).
 * @returns Resolves once the tooltip rendered.
 */
async function hover(el: Element): Promise<void> {
  const trigger = el.parentElement
  expect(trigger, 'the control must be wrapped in the tooltip trigger').not.toBeNull()
  trigger?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  await nextTick()
  await nextTick()
}

/**
 * Leaves a control's Tooltip trigger and waits out the delayed hide.
 *
 * @param el - The control element.
 * @returns Resolves once the tooltip is gone.
 */
async function unhover(el: Element): Promise<void> {
  el.parentElement?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  // The Vue Tooltip hides on a 150ms grace timer, then re-renders on the tick.
  await delay(200)
  await nextTick()
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
  for (const panel of mounted.splice(0)) panel.unmount()
  document.body.innerHTML = ''
})

/**
 * Every always-visible preview-toolbar control, with the i18n default text its
 * tooltip must show. `preview-device-cycle` is the DeviceFrameSelector dropdown
 * trigger; the rest are BarButtons. The "Rotate" and "Open in new tab" controls
 * are NOT listed here: they moved INTO the device-frame dropdown (P4-04), where
 * they render as plain menu-item rows (no Tooltip). (Rotate also only applies to
 * fixed-frame devices; the stub state is `none`.)
 */
const PREVIEW_CONTROLS: ReadonlyArray<{ id: string; tip: string }> = [
  { id: 'preview-device-cycle', tip: 'Device frame' },
  { id: 'preview-back', tip: 'Back' },
  { id: 'preview-forward', tip: 'Forward' },
  { id: 'preview-refresh', tip: 'Refresh preview' },
]

describe('PreviewPanel tooltips (IDE1 — real styled Tooltip, not native title)', () => {
  it('renders NO native `title` attribute on any preview control', () => {
    const panel = mount()
    for (const { id } of PREVIEW_CONTROLS) {
      const el = q(panel.container, id)
      expect(el, `${id} should render`).not.toBeNull()
      // The native `title` is the delayed, unstyled, touch-blind tooltip the
      // audit rejected — it must be gone entirely.
      expect(el?.hasAttribute('title'), `${id} must NOT use the native title attr`).toBe(false)
    }
  })

  it('renders the framework Tooltip component on hover for every control', async () => {
    const panel = mount()
    for (const { id, tip } of PREVIEW_CONTROLS) {
      const el = q(panel.container, id) as HTMLElement
      // The framework Tooltip wraps its child in a trigger element; hovering it
      // mounts a `role="tooltip"` popover in a portal. A native `title` produces
      // no such element, so this only passes with the real component wired.
      await hover(el)
      const tooltip = document.body.querySelector('[role="tooltip"]')
      expect(tooltip, `${id} must render the styled Tooltip on hover`).not.toBeNull()
      expect(tooltip?.textContent, `${id} tooltip text comes through i18n t()`).toBe(tip)
      await unhover(el)
      expect(document.body.querySelector('[role="tooltip"]')).toBeNull()
    }
  })

  it('hides the tooltip when the control is clicked (P5-02)', async () => {
    const panel = mount()
    for (const { id } of PREVIEW_CONTROLS) {
      const el = q(panel.container, id) as HTMLElement
      // Hover mounts the tooltip…
      await hover(el)
      expect(
        document.body.querySelector('[role="tooltip"]'),
        `${id} tooltip should show on hover`,
      ).not.toBeNull()
      // …and clicking the control must hide it again — a click shouldn't leave a
      // tooltip lingering over the button the user just pressed.
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await nextTick()
      await nextTick()
      expect(
        document.body.querySelector('[role="tooltip"]'),
        `${id} tooltip must be hidden after the control is clicked`,
      ).toBeNull()
    }
  })

  it('themes the tooltip via ClassMap tokens, never a hardcoded hex color', async () => {
    const panel = mount()
    const refresh = q(panel.container, 'preview-refresh') as HTMLElement
    await hover(refresh)
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
    const panel = mount()
    for (const { id } of PREVIEW_CONTROLS) {
      const el = q(panel.container, id) as HTMLElement
      expect(
        el.querySelector('svg'),
        `${id} must render an <svg> icon, not an emoji`,
      ).not.toBeNull()
    }
  })
})
