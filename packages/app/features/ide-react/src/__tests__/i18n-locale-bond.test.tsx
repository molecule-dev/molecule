// @vitest-environment jsdom

/**
 * cross-cutting-i18n — IDE-shell strings must resolve through the locale bond,
 * not just the inline English `defaultValue`.
 *
 * The MVP audit found new IDE UI strings shipped as `t(key, …, { defaultValue })`
 * inline only, with the key never added to the companion `@molecule/app-locales-ide`
 * bond — so English looked fine while every other locale silently fell back to
 * English. A source grep or an English-only render can't catch this, because the
 * `defaultValue` masks the missing key. This test loads the REAL ide bond's
 * French table into the i18n provider, renders the actual components, and asserts
 * the rendered DOM shows the bonded French translation (not the English default).
 * If the key were missing from the bond, the component would render the English
 * default and these assertions would fail — exactly the gap that shipped.
 *
 * Covers the surfaces synced for this finding: the preview toolbar (PV1 URL bar,
 * PV5 back/forward) and the device-frame cycler tooltip.
 *
 * @module
 */

import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import * as ideLocales from '@molecule/app-locales-ide'
import { PreviewProvider as PreviewContextProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { DEVICE_META, nextDevice } from '../components/device-cycle.js'
import { DeviceFrameSelector } from '../components/DeviceFrameSelector.js'
import { PreviewPanel } from '../components/PreviewPanel.js'

const fr = ideLocales.fr as Record<string, string>

/**
 * A ClassMap stub whose every member resolves to its key as a class token
 *  (so layout helpers/`cn()` don't depend on a concrete styling bond).
 */
function buildStubClassMap(): UIClassMap {
  const token =
    (name: string) =>
    (..._args: unknown[]): string =>
      name
  const cn = (...classes: unknown[]): string => {
    const out: string[] = []
    const walk = (c: unknown): void => {
      if (Array.isArray(c)) c.forEach(walk)
      else if (typeof c === 'string' && c) out.push(c)
      else if (typeof c === 'function') {
        const s = String(c)
        if (s) out.push(s)
      }
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
 * A no-active-preview {@link PreviewProvider} so PreviewPanel renders only its
 *  always-visible toolbar (no iframe/polling/freeze effects).
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
 * Wrap children in the preview context PreviewPanel reads from.
 * @param root0 - Wrapper props.
 * @param root0.children - The component(s) under test.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return (
    <PreviewContextProvider provider={buildStubPreviewProvider()}>
      {children}
    </PreviewContextProvider>
  )
}

beforeEach(async () => {
  setClassMap(buildStubClassMap())
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  // The module-level `t()` resolves against the bonded provider (NOT React
  // context), so configure the singleton and load the real bond's fr table.
  const provider = createSimpleI18nProvider('en')
  setProvider(provider)
  provider.addLocale({ code: 'fr', name: 'French' })
  provider.addTranslations('fr', fr)
  await provider.setLocale('fr')
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('IDE-shell i18n resolves through the locale bond (cross-cutting-i18n)', () => {
  it('the bond defines the preview + device keys the components render', () => {
    // Guards the merge the audit found missing: the keys must actually exist in
    // the bond, not just as inline defaults.
    for (const key of [
      'ide.preview.back',
      'ide.preview.forward',
      'ide.preview.urlBar',
      'ide.device.cycleHint',
    ]) {
      expect(typeof fr[key], `${key} missing from app-locales-ide`).toBe('string')
      expect(fr[key].length, `${key} empty in app-locales-ide`).toBeGreaterThan(0)
    }
  })

  it('renders the preview toolbar back/forward titles from the bond, not the English default', () => {
    const { container } = render(
      <Wrap>
        <PreviewPanel />
      </Wrap>,
    )
    const back = container.querySelector('[data-mol-id="preview-back"]')
    const forward = container.querySelector('[data-mol-id="preview-forward"]')
    expect(back?.getAttribute('title')).toBe(fr['ide.preview.back'])
    expect(forward?.getAttribute('title')).toBe(fr['ide.preview.forward'])
    // The pre-fix bug: with the key absent, the default English "Back" rendered.
    expect(back?.getAttribute('title')).not.toBe('Back')
    expect(forward?.getAttribute('title')).not.toBe('Forward')
  })

  it('renders the device-cycle tooltip interpolated from the bonded template', () => {
    const current: DeviceFrame = 'desktop'
    const next = nextDevice(current)
    const expected = fr['ide.device.cycleHint']
      .replace('{{current}}', fr[DEVICE_META[current].labelKey])
      .replace('{{next}}', fr[DEVICE_META[next].labelKey])

    const { container } = render(
      <Wrap>
        <DeviceFrameSelector current={current} onChange={() => {}} />
      </Wrap>,
    )
    const button = container.querySelector('[data-mol-id="preview-device-cycle"]')
    expect(button?.getAttribute('title')).toBe(expected)
    // The English default template would have produced "… — click for …".
    expect(button?.getAttribute('title')).not.toContain('click for')
  })
})
