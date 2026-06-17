// @vitest-environment jsdom

/**
 * IDE11 — mobile/tablet touch-target regression guard.
 *
 * The preview toolbar's always-visible controls (device-frame cycle, back,
 * forward, refresh) render as compact `xs` ghost buttons (~26px tall). That is
 * fine for a mouse but below the WCAG 2.5.5 minimum tap target, so on a phone or
 * tablet they were unusably small — the exact gap the MVP audit flagged (the
 * earlier fix punted them as out of scope and only shipped pure-helper tests).
 *
 * (Open-in-new-tab moved into the device-frame dropdown as a menu-item row in
 * P4-04, so it is no longer a toolbar BarButton and is not asserted here.)
 *
 * This is a real jsdom render of {@link PreviewPanel} (not a source grep): it
 * mounts the actual component tree and asserts every preview control composes
 * `cm.touchTarget` onto its class list, on top of (not instead of) the compact
 * base button class. With the panel given no preview URL, all the polling /
 * iframe / freeze effects short-circuit, so the always-visible toolbar renders
 * deterministically without timers or network.
 *
 * The numeric `>=44px` value of `cm.touchTarget` (and its coarse-pointer scoping)
 * is locked by the ClassMap bond tests; here we guard the *wiring* — that the
 * controls opt into it at all, which is what was missing.
 *
 * @module
 */

import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import { I18nProvider, PreviewProvider as PreviewContextProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { PreviewPanel } from '../components/PreviewPanel.js'

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
  ) as unknown as UIClassMap
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
  setClassMap(buildStubClassMap())
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(() => {
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
    const { container } = render(
      <Wrap>
        <PreviewPanel />
      </Wrap>,
    )
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`)
      expect(el, `${id} should render`).not.toBeNull()
      expect(el?.tagName).toBe('BUTTON')
    }
  })

  it('applies cm.touchTarget to every preview control (the missing wiring)', () => {
    const { container } = render(
      <Wrap>
        <PreviewPanel />
      </Wrap>,
    )
    for (const id of PREVIEW_CONTROL_IDS) {
      const el = container.querySelector(`[data-mol-id="${id}"]`) as HTMLElement
      expect(el.className.split(/\s+/), `${id} must opt into the touch-target hit-area`).toContain(
        TOUCH_TARGET_TOKEN,
      )
    }
  })

  it('composes the touch target on top of the compact base button (not instead of)', () => {
    const { container } = render(
      <Wrap>
        <PreviewPanel />
      </Wrap>,
    )
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
