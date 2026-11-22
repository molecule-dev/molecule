// @vitest-environment jsdom
/**
 * PreviewPanel touch targets (IDE11) — a port of
 * `@molecule/app-ide-react/src/__tests__/PreviewPanel.touch-target.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication`.
 *
 * The preview toolbar's always-visible controls (device-frame cycle, back,
 * forward, refresh) render as compact `xs` ghost buttons (~26px tall). That is
 * fine for a mouse but below the WCAG 2.5.5 minimum tap target, so on a phone or
 * tablet they were unusably small — the exact gap the MVP audit flagged.
 *
 * This is a real jsdom render of {@link PreviewPanel}: it mounts the actual
 * component tree and asserts every preview control composes `cm.touchTarget`
 * onto its class list, on top of (not instead of) the compact base button class.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { type MountedPanel, mountPanel } from './preview-panel-harness.js'

/** The sentinel token a stub ClassMap returns for the `touchTarget` member. */
const TOUCH_TARGET_TOKEN = 'touchTarget'

/**
 * A ClassMap stub whose every member resolves to its own key as a class token.
 * Accessing a property (`cm.touchTarget`) or calling a method (`cm.button(...)`)
 * both yield the key string, and `cn()` flattens/stringifies them. This lets the
 * test assert *which* tokens a component composes without depending on a
 * concrete styling bond's compiled output.
 *
 * @returns A stub {@link UIClassMap}.
 */
function buildStubClassMap(): UIClassMap {
  const token = (name: string): ((...args: unknown[]) => string) => {
    const fn = (..._args: unknown[]): string => name
    return new Proxy(fn, {
      get(_t, key) {
        if (key === 'toString' || key === 'valueOf' || key === Symbol.toPrimitive) {
          return () => name
        }
        return undefined
      },
    }) as (...args: unknown[]) => string
  }

  const cn = (...classes: unknown[]): string => {
    const out: string[] = []
    const walk = (c: unknown): void => {
      if (Array.isArray(c)) c.forEach(walk)
      else if (typeof c === 'string') {
        if (c) out.push(c)
      } else if (typeof c === 'function') {
        const s = String(c)
        if (s) out.push(s)
      }
    }
    classes.forEach(walk)
    return out.join(' ')
  }

  return new Proxy({} as UIClassMap, {
    get(_t, prop): unknown {
      if (prop === 'cn') return cn
      // The Tooltip binds its trigger class straight into `[class]`, which
      // accepts a string only — a plain token keeps that binding renderable.
      if (prop === 'tooltipTrigger') return 'tooltipTrigger'
      return token(String(prop))
    },
  })
}

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
  setClassMap(buildStubClassMap())
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
  it('renders every preview control as a button', async () => {
    const panel = await mountPanel(buildStubPreviewProvider())
    mounted.push(panel)
    const { container } = panel
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`)
      expect(el, `${id} should render`).not.toBeNull()
      expect(el?.tagName).toBe('BUTTON')
    }
  })

  it('applies cm.touchTarget to every preview control (the missing wiring)', async () => {
    const panel = await mountPanel(buildStubPreviewProvider())
    mounted.push(panel)
    const { container } = panel
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`) as HTMLElement
      expect(el.className.split(/\s+/), `${id} must opt into the touch-target hit-area`).toContain(
        TOUCH_TARGET_TOKEN,
      )
    }
  })

  it('composes the touch target on top of the compact base button (not instead of)', async () => {
    const panel = await mountPanel(buildStubPreviewProvider())
    mounted.push(panel)
    const { container } = panel
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`) as HTMLElement
      const classes = el.className.split(/\s+/)
      // 'button' = the compact ghost button base; both must be present so the
      // desktop sizing is preserved while touch grows the hit-area.
      expect(classes, `${id} keeps its base button class`).toContain('button')
      expect(classes, `${id} adds the touch target`).toContain(TOUCH_TARGET_TOKEN)
    }
  })
})
