// @vitest-environment jsdom

/**
 * IDE11 — mobile/tablet touch-target regression guard.
 *
 * A port of
 * `@molecule/app-ide-react/src/__tests__/PreviewPanel.touch-target.test.tsx`
 * with the same test names and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync`.
 *
 * The preview toolbar's always-visible controls (device-frame cycle, back,
 * forward, refresh) render as compact `xs` ghost buttons (~26px tall). That is
 * fine for a mouse but below the WCAG 2.5.5 minimum tap target, so on a phone or
 * tablet they were unusably small — the exact gap the MVP audit flagged.
 *
 * (Open-in-new-tab moved into the device-frame dropdown as a menu-item row in
 * P4-04, so it is no longer a toolbar BarButton and is not asserted here.)
 *
 * This is a real jsdom render of `PreviewPanel`: it mounts the actual component
 * tree and asserts every preview control composes `cm.touchTarget` onto its
 * class list, on top of (not instead of) the compact base button class. With the
 * panel given no preview URL, all the polling / iframe / freeze effects
 * short-circuit, so the always-visible toolbar renders deterministically without
 * timers or network.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setIconSet } from '@molecule/app-icons'

import type { MountedPanel } from './preview-panel-harness.js'
import {
  buildPreviewProvider,
  installStubClassMap,
  mountPanel,
  q,
} from './preview-panel-harness.js'

/** The sentinel token a stub ClassMap returns for the `touchTarget` member. */
const TOUCH_TARGET_TOKEN = 'touchTarget'

/** The always-visible preview toolbar controls the audit found stuck at ~26px on touch. */
const PREVIEW_CONTROL_IDS = [
  'preview-device-cycle',
  'preview-back',
  'preview-forward',
  'preview-refresh',
] as const

/** The panel a test mounted, torn down after the test. */
let panel: MountedPanel | null = null

beforeEach(() => {
  // The stub ClassMap resolves every member to its own key, so the test can
  // assert WHICH tokens a control composes without a concrete styling bond.
  installStubClassMap()
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(async () => {
  await panel?.dispose()
  panel = null
  document.body.innerHTML = ''
})

/**
 * Mounts the panel with no preview URL (the toolbar only).
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

describe('PreviewPanel touch targets (IDE11)', () => {
  it('renders every preview control as a button', () => {
    const { container } = mount()
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = q(container, id)
      expect(el, `${id} should render`).not.toBeNull()
      expect(el?.tagName).toBe('BUTTON')
    }
  })

  it('applies cm.touchTarget to every preview control (the missing wiring)', () => {
    const { container } = mount()
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = q(container, id) as HTMLElement
      expect(el.className.split(/\s+/), `${id} must opt into the touch-target hit-area`).toContain(
        TOUCH_TARGET_TOKEN,
      )
    }
  })

  it('composes the touch target on top of the compact base button (not instead of)', () => {
    const { container } = mount()
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = q(container, id) as HTMLElement
      const classes = el.className.split(/\s+/)
      // 'button' = the compact ghost button base; both must be present so the
      // desktop sizing is preserved while touch grows the hit-area.
      expect(classes, `${id} keeps its base button class`).toContain('button')
      expect(classes, `${id} adds the touch target`).toContain(TOUCH_TARGET_TOKEN)
    }
  })
})
