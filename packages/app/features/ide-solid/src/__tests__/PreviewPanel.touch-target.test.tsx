// @vitest-environment jsdom
/**
 * IDE11 — mobile/tablet touch-target regression guard: a port of
 * `@molecule/app-ide-react/src/__tests__/PreviewPanel.touch-target.test.tsx`
 * with the same test names and the same assertions, mounted as a real Solid root.
 *
 * The preview toolbar's always-visible controls render as compact `xs` ghost
 * buttons (~26px tall). That is fine for a mouse but below the WCAG 2.5.5
 * minimum tap target, so every control must compose `cm.touchTarget` onto its
 * class list, on top of (not instead of) the compact base button class.
 *
 * This is a real jsdom render of {@link PreviewPanel} (not a source grep): with
 * the panel given no preview URL, all the polling / iframe / freeze effects
 * short-circuit, so the always-visible toolbar renders deterministically.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { setIconSet } from '@molecule/app-icons'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { PreviewContext } from '@molecule/app-solid'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { PreviewPanel } from '../components/PreviewPanel.jsx'

/** The sentinel token a stub ClassMap returns for the `touchTarget` member. */
const TOUCH_TARGET_TOKEN = 'touchTarget'

/**
 * A ClassMap stub whose every member resolves to its own key as a class token.
 * Accessing a property (`cm.touchTarget`) or calling a method (`cm.button(...)`)
 * both yield the key string, and `cn()` flattens/stringifies them. This lets the
 * test assert *which* tokens a component composes (e.g. that `touchTarget` is on
 * a button) without depending on a concrete styling bond's compiled output.
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
      if (Array.isArray(c)) {
        c.forEach(walk)
      } else if (typeof c === 'string') {
        if (c) out.push(c)
      } else if (typeof c === 'function') {
        const s = String(c)
        if (s) out.push(s)
      }
      // null / undefined / false / numbers are intentionally dropped, matching
      // how a real cn() ignores falsy conditional class values.
    }
    classes.forEach(walk)
    return out.join(' ')
  }

  return new Proxy(
    {},
    {
      get(_t, prop): unknown {
        if (prop === 'cn') return cn
        return token(String(prop))
      },
    },
  ) as UIClassMap
}

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

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(() => {
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

/** The always-visible preview toolbar controls the audit found stuck at ~26px on touch. */
const PREVIEW_CONTROL_IDS = [
  'preview-device-cycle',
  'preview-back',
  'preview-forward',
  'preview-refresh',
] as const

describe('PreviewPanel touch targets (IDE11)', () => {
  it('renders every preview control as a button', () => {
    const container = renderPanel()
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`)
      expect(el, `${id} should render`).not.toBeNull()
      expect(el?.tagName).toBe('BUTTON')
    }
  })

  it('applies cm.touchTarget to every preview control (the missing wiring)', () => {
    const container = renderPanel()
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`) as HTMLElement
      expect(el.className.split(/\s+/), `${id} must opt into the touch-target hit-area`).toContain(
        TOUCH_TARGET_TOKEN,
      )
    }
  })

  it('composes the touch target on top of the compact base button (not instead of)', () => {
    const container = renderPanel()
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
