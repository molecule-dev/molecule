// @vitest-environment jsdom
/**
 * PreviewPanel tooltips (IDE1 — real styled Tooltip, not native title) — a port
 * of `@molecule/app-ide-react/src/__tests__/PreviewPanel.tooltip.test.tsx` with
 * the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication`.
 *
 * The MVP intent audit flagged that "obvious on hover" was met only literally:
 * every preview/IDE affordance used the delayed, unstyled, touch-blind native
 * `title` attribute while the framework's REAL styled `Tooltip` shipped but was
 * imported NOWHERE. This guard pins the foundation fix on the reference surface
 * (the preview toolbar): every control must render the framework `Tooltip`
 * component — instant, themed via ClassMap tokens, focus/hover-aware — and NEVER
 * the native `title` attribute.
 *
 * This is a real jsdom render of {@link PreviewPanel}, using the REAL
 * `@molecule/app-ui-tailwind` ClassMap so the tooltip's resolved classes are the
 * actual themed tokens. With the panel given no preview URL, all the polling /
 * iframe / freeze effects short-circuit, so the always-visible toolbar renders
 * deterministically without timers or network.
 *
 * Angular's Tooltip listens for the DOM's bubbling `mouseover`/`mouseout` (the
 * boundary pair React itself derives `onMouseEnter`/`onMouseLeave` from), so the
 * hover is dispatched as those events.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type MountedPanel, mountPanel, settle } from './preview-panel-harness.js'

/**
 * A minimal {@link PreviewProvider} with no active preview, so the panel's
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
 * Mounts the panel over a no-active-preview provider.
 *
 * @returns The mounted panel.
 */
async function mount(): Promise<MountedPanel> {
  const panel = await mountPanel(buildStubPreviewProvider())
  mounted.push(panel)
  return panel
}

/**
 * Hovers a control's Tooltip trigger and lets the view render the popover.
 *
 * @param trigger - The Tooltip's trigger wrapper.
 * @returns Resolves once the view rendered.
 */
async function hover(trigger: HTMLElement): Promise<void> {
  trigger.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  await settle()
}

/**
 * Leaves a control's Tooltip trigger and lets the view render the removal.
 *
 * @param trigger - The Tooltip's trigger wrapper.
 * @returns Resolves once the view rendered.
 */
async function unhover(trigger: HTMLElement): Promise<void> {
  trigger.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  await settle()
}

/**
 * Every always-visible preview-toolbar control, with the i18n default text its
 * tooltip must show.
 */
const PREVIEW_CONTROLS: ReadonlyArray<{ id: string; tip: string }> = [
  { id: 'preview-device-cycle', tip: 'Device frame' },
  { id: 'preview-back', tip: 'Back' },
  { id: 'preview-forward', tip: 'Forward' },
  { id: 'preview-refresh', tip: 'Refresh preview' },
]

describe('PreviewPanel tooltips (IDE1 — real styled Tooltip, not native title)', () => {
  it('renders NO native `title` attribute on any preview control', async () => {
    const { container } = await mount()
    for (const { id } of PREVIEW_CONTROLS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`)
      expect(el, `${id} should render`).not.toBeNull()
      // The native `title` is the delayed, unstyled, touch-blind tooltip the
      // audit rejected — it must be gone entirely.
      expect(el?.hasAttribute('title'), `${id} must NOT use the native title attr`).toBe(false)
    }
  })

  it('renders the framework Tooltip component on hover for every control', async () => {
    const { container } = await mount()
    for (const { id, tip } of PREVIEW_CONTROLS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`) as HTMLElement
      // The framework Tooltip wraps its child in a trigger element; hovering it
      // mounts a `role="tooltip"` popover in a portal. A native `title` produces
      // no such element, so this only passes with the real component wired.
      const trigger = el.parentElement as HTMLElement
      await hover(trigger)
      const tooltip = document.body.querySelector('[role="tooltip"]')
      expect(tooltip, `${id} must render the styled Tooltip on hover`).not.toBeNull()
      expect(tooltip?.textContent, `${id} tooltip text comes through i18n t()`).toBe(tip)
      await unhover(trigger)
      await vi.waitFor(() => expect(document.body.querySelector('[role="tooltip"]')).toBeNull())
    }
  })

  it('hides the tooltip when the control is clicked (P5-02)', async () => {
    const { container } = await mount()
    for (const { id } of PREVIEW_CONTROLS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`) as HTMLElement
      const trigger = el.parentElement as HTMLElement
      // Hover mounts the tooltip…
      await hover(trigger)
      expect(
        document.body.querySelector('[role="tooltip"]'),
        `${id} tooltip should show on hover`,
      ).not.toBeNull()
      // …and clicking the control must hide it again — a click shouldn't leave a
      // tooltip lingering over the button the user just pressed. Dispatched as a
      // bubbling event (the way React's synthetic click fires) so a disabled
      // control's click still reaches the Tooltip, exactly as in React.
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await settle()
      expect(
        document.body.querySelector('[role="tooltip"]'),
        `${id} tooltip must be hidden after the control is clicked`,
      ).toBeNull()
    }
  })

  it('themes the tooltip via ClassMap tokens, never a hardcoded hex color', async () => {
    const { container } = await mount()
    const refresh = container.querySelector('[data-mol-id="preview-refresh"]') as HTMLElement
    await hover(refresh.parentElement as HTMLElement)
    const tooltip = document.body.querySelector('[role="tooltip"]') as HTMLElement
    expect(tooltip).not.toBeNull()
    const className = tooltip.className
    // Surface + foreground come from theme tokens (light/dark aware), not hex.
    expect(className, 'tooltip surface must be a theme token').toContain('bg-surface')
    expect(className, 'tooltip text must be a theme token').toContain('text-foreground')
    // No raw hex literal anywhere in the resolved class string.
    expect(className).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })

  it('renders a real SVG icon (never an emoji glyph) inside every control', async () => {
    const { container } = await mount()
    for (const { id } of PREVIEW_CONTROLS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`) as HTMLElement
      expect(
        el.querySelector('svg'),
        `${id} must render an <svg> icon, not an emoji`,
      ).not.toBeNull()
    }
  })
})
