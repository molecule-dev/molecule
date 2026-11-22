// @vitest-environment jsdom
/**
 * SearchPanel's own text goes through i18n — including the parts a screenshot
 * cannot see: a port of
 * `@molecule/app-ide-react/src/__tests__/SearchPanel.i18n.test.tsx` with the
 * same test names and the same assertions, mounted through Vue's own
 * `createApp` with the theme and http plugins (the only providers the panel
 * needs).
 *
 * - the glyph toggles (`Aa`, `ab`, `.*`, `⋯`) expose their translated `title`
 *   as the accessible name (`aria-label`), and the glyph itself is decorative
 *   (`aria-hidden="true"`) — a screen reader says "Match Case, toggle button",
 *   never "Aa, toggle button";
 * - the excluded-directories input's placeholder (`node_modules, .git, dist`)
 *   is an EXAMPLE of the input, the same in every language, so the field
 *   carries HTML's `translate="no"` instead of a t() key.
 *
 * A marker translator whose text names the key proves each string goes through
 * `t` with the right key.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import type { HttpClient } from '@molecule/app-http'
import {
  createSimpleI18nProvider,
  type I18nProvider as I18nProviderContract,
  setProvider,
} from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createHttpPlugin, createThemePlugin } from '@molecule/app-vue'

import { SearchPanel } from '../index.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A provider whose `t` returns `⟦<key>⟧` — the key is what renders. */
function buildMarkerProvider(): I18nProviderContract {
  const base = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
  ])
  return {
    ...base,
    t: (key) => `⟦${key}⟧`,
  }
}

/** An HTTP client whose every request rejects; the mounted callers catch their own. */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: reject,
    post: reject,
    put: reject,
    patch: reject,
    delete: reject,
    addRequestInterceptor: () => () => {},
    addResponseInterceptor: () => () => {},
    addErrorInterceptor: () => () => {},
    setAuthToken: () => {},
    getAuthToken: () => null,
    onAuthError: () => () => {},
  }
}

/** jsdom has no `matchMedia`; the viewport hooks answer every query false. */
function stubMatchMedia(): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string): MediaQueryList =>
      Object.assign(new EventTarget(), {
        matches: false,
        media: query,
        onchange: null,
        addListener: (): void => undefined,
        removeListener: (): void => undefined,
      }),
  })
}

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * Mount the panel with the marker provider, the way a host does.
 *
 * @param provider - The i18n provider.
 * @returns The mounted element.
 */
function renderPanel(provider: I18nProviderContract): HTMLElement {
  if (mounted.app) {
    mounted.app.unmount()
    mounted.app = undefined
  }
  document.body.innerHTML = ''
  setProvider(provider)
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(SearchPanel, { projectId: 'proj-i18n' }),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider()))
  app.use(createHttpPlugin(buildHttpClient()))
  mounted.app = app
  app.mount(host)
  return host
}

/** A glyph toggle's accessible name and its decorative glyph, by mol id. */
function toggle(
  container: HTMLElement,
  molId: string,
): {
  button: HTMLElement
  ariaLabel: string | null
  glyph: string
  glyphHidden: string | null
} {
  const button = container.querySelector(`[data-mol-id="${molId}"]`)
  expect(button, `${molId} must be mounted`).not.toBeNull()
  const glyphSpan = button!.querySelector('span[aria-hidden="true"]')
  expect(glyphSpan, `${molId} must wrap its glyph in an aria-hidden span`).not.toBeNull()
  return {
    button: button as HTMLElement,
    ariaLabel: button!.getAttribute('aria-label'),
    glyph: glyphSpan!.textContent ?? '',
    glyphHidden: glyphSpan!.getAttribute('aria-hidden'),
  }
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  stubMatchMedia()
})

afterEach(async () => {
  if (mounted.app) {
    mounted.app.unmount()
    mounted.app = undefined
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

describe('SearchPanel accessible names and non-translated example input', () => {
  it('gives every glyph toggle a translated aria-label and hides the glyph', async () => {
    const container = renderPanel(buildMarkerProvider())
    await nextTick()

    expect(toggle(container, 'search-toggle-case')).toMatchObject({
      ariaLabel: '⟦ide.search.caseSensitive⟧',
      glyph: 'Aa',
      glyphHidden: 'true',
    })
    expect(toggle(container, 'search-toggle-whole-word')).toMatchObject({
      ariaLabel: '⟦ide.search.wholeWord⟧',
      glyph: 'ab',
      glyphHidden: 'true',
    })
    expect(toggle(container, 'search-toggle-regex')).toMatchObject({
      ariaLabel: '⟦ide.search.regex⟧',
      glyph: '.*',
      glyphHidden: 'true',
    })
    expect(toggle(container, 'search-toggle-filters')).toMatchObject({
      ariaLabel: '⟦ide.search.toggleFilters⟧',
      glyph: '⋯',
      glyphHidden: 'true',
    })
  })

  it('keeps the visible text of the glyph toggles out of the accessible tree', async () => {
    const container = renderPanel(buildMarkerProvider())
    await nextTick()
    for (const molId of [
      'search-toggle-case',
      'search-toggle-whole-word',
      'search-toggle-regex',
      'search-toggle-filters',
    ]) {
      const { button } = toggle(container, molId)
      // The accessible name is the translated title, never the glyph itself.
      expect(button.textContent).not.toBe(button.getAttribute('aria-label'))
    }
  })

  it('marks the excluded-directories input translate="no" (its placeholder is an example, not prose)', async () => {
    const container = renderPanel(buildMarkerProvider())
    await nextTick()
    toggle(container, 'search-toggle-filters').button.click()
    await nextTick()
    await nextTick()

    const input = container.querySelector('input[data-mol-id="search-excluded-dirs"]')
    expect(input, 'the filters row must expose the excluded-dirs input').not.toBeNull()
    expect(input!.getAttribute('translate')).toBe('no')
    // The placeholder stays the example list — no key, no marker.
    expect(input!.getAttribute('placeholder')).toBe('node_modules, .git, dist')
  })
})
