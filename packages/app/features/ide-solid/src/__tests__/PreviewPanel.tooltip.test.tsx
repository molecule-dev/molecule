// @vitest-environment jsdom
/**
 * IDE1 / "obvious on hover" — preview-toolbar tooltip-quality regression guard: a
 * port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.tooltip.test.tsx`
 * with the same test names and the same assertions, mounted as a real Solid root.
 *
 * Every preview-toolbar control must render the framework `Tooltip` component —
 * instant, themed via ClassMap tokens, focus/hover-aware — and NEVER the native
 * `title` attribute. This is a real jsdom render of {@link PreviewPanel} (not a
 * source grep), with the REAL `@molecule/app-ui-tailwind` ClassMap so the
 * tooltip's resolved classes are the actual themed tokens.
 *
 * The Solid panel is a view over the same shared behaviour; the Tooltip is the
 * Solid framework component, whose trigger derives hover from the bubbling
 * `mouseover`/`mouseout` pair (the events React derives `onMouseEnter`/
 * `onMouseLeave` from), so the hover helpers dispatch those.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { PreviewContext } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { PreviewPanel } from '../components/PreviewPanel.jsx'

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

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  // The REAL themed ClassMap — so the tooltip's resolved classes are the actual
  // theme tokens (not a stub), which is what the "no hardcoded hex" check needs.
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon only needs a defined entry and
  // still renders a real <svg> (never an emoji string).
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(() => {
  // Unmount the proper way so the Tooltip's portal nodes are removed by Solid.
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
})

/**
 * Renders the panel over the stub preview provider.
 * @returns The container the panel rendered into.
 */
function renderPanel(): HTMLElement {
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <PreviewContext.Provider value={buildStubPreviewProvider()}>
        <PreviewPanel />
      </PreviewContext.Provider>
    ),
    container,
  )
  return container
}

/** Lets Solid settle what a DOM event queued (Solid's updates are synchronous). */
async function flush(): Promise<void> {
  await Promise.resolve()
}

/**
 * Hovers an element the way a user's pointer entering it does (the bubbling
 * `mouseover` the Tooltip wrapper derives its enter from).
 * @param el - The element entered.
 */
async function hover(el: HTMLElement): Promise<void> {
  el.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  await flush()
}

/**
 * Unhovers an element the way a user's pointer leaving it does.
 * @param el - The element left.
 */
async function unhover(el: HTMLElement): Promise<void> {
  el.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  await flush()
}

/**
 * Every always-visible preview-toolbar control, with the i18n default text its
 * tooltip must show. `preview-device-cycle` is the DeviceFrameSelector dropdown
 * trigger; the rest are BarButtons. The "Rotate" and "Open in new tab" controls
 * are NOT listed here: they moved INTO the device-frame dropdown (P4-04), where
 * they render as plain menu-item rows (no Tooltip).
 */
const PREVIEW_CONTROLS: ReadonlyArray<{ id: string; tip: string }> = [
  { id: 'preview-device-cycle', tip: 'Device frame' },
  { id: 'preview-back', tip: 'Back' },
  { id: 'preview-forward', tip: 'Forward' },
  { id: 'preview-refresh', tip: 'Refresh preview' },
]

describe('PreviewPanel tooltips (IDE1 — real styled Tooltip, not native title)', () => {
  it('renders NO native `title` attribute on any preview control', () => {
    const container = renderPanel()
    for (const { id } of PREVIEW_CONTROLS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`)
      expect(el, `${id} should render`).not.toBeNull()
      // The native `title` is the delayed, unstyled, touch-blind tooltip the
      // audit rejected — it must be gone entirely.
      expect(el?.hasAttribute('title'), `${id} must NOT use the native title attr`).toBe(false)
    }
  })

  it('renders the framework Tooltip component on hover for every control', async () => {
    const container = renderPanel()
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
    const container = renderPanel()
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
      // tooltip lingering over the button the user just pressed.
      el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      await flush()
      expect(
        document.body.querySelector('[role="tooltip"]'),
        `${id} tooltip must be hidden after the control is clicked`,
      ).toBeNull()
    }
  })

  it('themes the tooltip via ClassMap tokens, never a hardcoded hex color', async () => {
    const container = renderPanel()
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

  it('renders a real SVG icon (never an emoji glyph) inside every control', () => {
    const container = renderPanel()
    for (const { id } of PREVIEW_CONTROLS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`) as HTMLElement
      expect(
        el.querySelector('svg'),
        `${id} must render an <svg> icon, not an emoji`,
      ).not.toBeNull()
    }
  })
})
