// @vitest-environment jsdom

/**
 * IDE11 — mobile/tablet touch-target regression guard.
 *
 * Port of `@molecule/app-ide-react/src/__tests__/PreviewPanel.touch-target.test.tsx`
 * with the same test names and the same behavioural assertions.
 *
 * The preview toolbar's always-visible controls (device-frame cycle, back,
 * forward, refresh) render as compact `xs` ghost buttons (~26px tall). That is
 * fine for a mouse but below the WCAG 2.5.5 minimum tap target, so on a phone or
 * tablet they were unusably small — the exact gap the MVP audit flagged.
 *
 * (Open-in-new-tab moved into the device-frame dropdown as a menu-item row in
 * P4-04, so it is no longer a toolbar button and is not asserted here.)
 *
 * This is a real jsdom render of {@link PreviewPanel}: it mounts the actual
 * component tree and asserts every preview control composes `cm.touchTarget`
 * onto its class list, on top of (not instead of) the compact base button class.
 * The REAL `@molecule/app-ui-tailwind` ClassMap is bonded, so the tokens asserted
 * are the ones a user's browser really receives (React's port stubs the ClassMap;
 * a stub here would need an unchecked cast, so the resolved tokens serve the same
 * "is it wired" purpose with the real bond). With the panel given no preview URL,
 * all the polling / iframe / freeze effects short-circuit, so the always-visible
 * toolbar renders deterministically without timers or network.
 *
 * The numeric `>=44px` value of `cm.touchTarget` (and its coarse-pointer scoping)
 * is locked by the ClassMap bond tests; here we guard the *wiring* — that the
 * controls opt into it at all, which is what was missing.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { type MountedPanel, mountPanel, q } from './preview-panel-harness.js'

/** The compact ghost button base the toolbar controls keep (React's `button` token). */
const BASE_BUTTON = classMap.button({ variant: 'ghost', size: 'xs' })

/** The coarse-pointer hit-area the controls must opt into. */
const TOUCH_TARGET = classMap.touchTarget

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
 * The class tokens on an element.
 *
 * @param el - The element.
 * @returns Its classes, split on whitespace.
 */
function classesOf(el: Element): string[] {
  return (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
}

beforeEach(() => {
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(() => {
  for (const panel of mounted.splice(0)) panel.unmount()
  document.body.innerHTML = ''
})

/** The always-visible preview toolbar controls the audit found stuck at ~26px on touch. */
const PREVIEW_CONTROL_IDS = [
  'preview-device-cycle',
  'preview-back',
  'preview-forward',
  'preview-refresh',
] as const

describe('PreviewPanel touch targets (IDE11)', () => {
  it('renders every preview control as a button', () => {
    const panel = mount()
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = q(panel.container, id)
      expect(el, `${id} should render`).not.toBeNull()
      expect(el?.tagName).toBe('BUTTON')
    }
  })

  it('applies cm.touchTarget to every preview control (the missing wiring)', () => {
    const panel = mount()
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = q(panel.container, id) as HTMLElement
      const classes = classesOf(el)
      for (const token of TOUCH_TARGET.split(/\s+/)) {
        expect(classes, `${id} must opt into the touch-target hit-area`).toContain(token)
      }
    }
  })

  it('composes the touch target on top of the compact base button (not instead of)', () => {
    const panel = mount()
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = q(panel.container, id) as HTMLElement
      const classes = classesOf(el)
      // The compact ghost button base stays; both must be present so the
      // desktop sizing is preserved while touch grows the hit-area.
      for (const token of BASE_BUTTON.split(/\s+/)) {
        expect(classes, `${id} keeps its base button class`).toContain(token)
      }
      for (const token of TOUCH_TARGET.split(/\s+/)) {
        expect(classes, `${id} adds the touch target`).toContain(token)
      }
    }
  })
})
