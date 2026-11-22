// @vitest-environment jsdom

/**
 * The tool-call label goes through i18n at render: `toolLabel` (in
 * `@molecule/app-ide-panel-logic`) emits its English words through `ide.tool.*`
 * keys, and the file names stay data in `` `backtick` `` segments. With a marker
 * translator that names the key, the card's collapsed row must show the marker
 * next to the untouched data segments — and follow a locale switch, because the
 * label is recomputed on every render (the en-XA conformance snapshot caught
 * "Read" staying plain English through one).
 *
 * A port of `@molecule/app-ide-react`'s `ToolCallCard.i18n.test.tsx` with the
 * same test names and the same assertions, mounted as a real Solid root under
 * `MoleculeProvider` with the marker i18n provider and the theme.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  createSimpleI18nProvider,
  type I18nProvider as I18nProviderContract,
  setProvider as setI18nProvider,
} from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/ToolCallCard.jsx'
import { buildThemeProvider } from './theme-test-provider.js'

/** A second locale the marker translator can switch to. */
const MARKER_LOCALE = 'xx'

/**
 * A provider whose `t` returns `⟦<locale>|<key>⟧` — naming the locale and the
 * key, so a test can prove WHICH key rendered and that a locale switch
 * re-translated the label.
 *
 * @returns The marker i18n provider.
 */
function buildMarkerProvider(): I18nProviderContract {
  const base = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
    { code: MARKER_LOCALE, name: 'Marker', direction: 'ltr', translations: {} },
  ])
  return {
    ...base,
    t: (key) => `⟦${base.getLocale()}|${key}⟧`,
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

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void; container?: HTMLElement } = {}

/**
 * Mount the card under the marker provider, the way a host does.
 *
 * @param provider - The i18n provider.
 * @param overrides - Props to override.
 * @returns The container.
 */
function renderCard(
  provider: I18nProviderContract,
  overrides: Partial<ToolCallCardProps>,
): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.container = container
  mounted.dispose = render(
    () => (
      <MoleculeProvider theme={buildThemeProvider()} i18n={provider}>
        <ToolCallCard
          id="t1"
          name="read_file"
          input={{ path: 'src/index.ts' }}
          status="done"
          {...overrides}
        />
      </MoleculeProvider>
    ),
    container,
  )
  return container
}

/** Lets Solid's queued effects settle before the assertions. */
async function settle(): Promise<void> {
  for (let i = 0; i < 3; i++) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0)
    })
  }
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  stubMatchMedia()
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setI18nProvider(createSimpleI18nProvider())
})

describe('ToolCallCard labels go through ide.tool.* keys (marker translator)', () => {
  it('renders a read_file label through ide.tool.read with the filename as data', () => {
    const provider = buildMarkerProvider()
    setI18nProvider(provider)
    const container = renderCard(provider, {})

    const text = container.textContent ?? ''
    expect(text).toContain('⟦en|ide.tool.read⟧')
    // The filename stays a data segment, untouched by the marker translator.
    expect(text).toContain('index.ts')
    expect(text).not.toContain('⟦index.ts⟧')
  })

  it('renders a sentence-shaped label through its key', () => {
    const provider = buildMarkerProvider()
    setI18nProvider(provider)
    const container = renderCard(provider, { id: 't2', name: 'reload_preview', input: {} })
    expect(container.textContent).toContain('⟦en|ide.tool.reloadPreview⟧')
  })

  it('re-translates the label after a locale switch (the label is computed at render)', async () => {
    const provider = buildMarkerProvider()
    setI18nProvider(provider)
    const container = renderCard(provider, { id: 't3' })
    expect(container.textContent).toContain('⟦en|ide.tool.read⟧')

    await provider.setLocale(MARKER_LOCALE)
    await settle()

    expect(container.textContent).toContain(`⟦${MARKER_LOCALE}|ide.tool.read⟧`)
  })
})
