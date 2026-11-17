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
 * @module
 */

import { act, cleanup, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  createSimpleI18nProvider,
  type I18nProvider as I18nProviderContract,
  setProvider as setI18nProvider,
} from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { I18nProvider, ThemeProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ToolCallCard } from '../components/ToolCallCard.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A second locale the marker translator can switch to. */
const MARKER_LOCALE = 'xx'

/**
 * A provider whose `t` returns `⟦<locale>|<key>⟧` — naming the locale and the
 * key, so a test can prove WHICH key rendered and that a locale switch
 * re-translated the label.
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

function renderCard(provider: I18nProviderContract, card: ReactElement): ReactElement {
  const wrap = (children: ReactNode): ReactElement => (
    <I18nProvider provider={provider}>
      <ThemeProvider provider={buildThemeProvider()}>{children}</ThemeProvider>
    </I18nProvider>
  )
  return wrap(card)
}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [], viewBox: '0 0 16 16' }) }))
  stubMatchMedia()
  // `toolLabel` (panel-logic) translates through the module-level `t`, which
  // reads the GLOBAL provider — bond the marker provider there, and mount the
  // card under the same provider for the components' own context reads.
})

afterEach(cleanup)

describe('ToolCallCard labels go through ide.tool.* keys (marker translator)', () => {
  it('renders a read_file label through ide.tool.read with the filename as data', () => {
    const provider = buildMarkerProvider()
    setI18nProvider(provider)
    const { container } = render(
      renderCard(
        provider,
        <ToolCallCard id="t1" name="read_file" input={{ path: 'src/index.ts' }} status="done" />,
      ),
    )

    const text = container.textContent ?? ''
    expect(text).toContain('⟦en|ide.tool.read⟧')
    // The filename stays a data segment, untouched by the marker translator.
    expect(text).toContain('index.ts')
    expect(text).not.toContain('⟦index.ts⟧')
  })

  it('renders a sentence-shaped label through its key', () => {
    const provider = buildMarkerProvider()
    setI18nProvider(provider)
    const { container } = render(
      renderCard(provider, <ToolCallCard id="t2" name="reload_preview" input={{}} status="done" />),
    )
    expect(container.textContent).toContain('⟦en|ide.tool.reloadPreview⟧')
  })

  it('re-translates the label after a locale switch (the label is computed at render)', async () => {
    const provider = buildMarkerProvider()
    setI18nProvider(provider)
    const { container } = render(
      renderCard(
        provider,
        <ToolCallCard id="t3" name="read_file" input={{ path: 'src/index.ts' }} status="done" />,
      ),
    )
    expect(container.textContent).toContain('⟦en|ide.tool.read⟧')

    await act(async () => {
      await provider.setLocale(MARKER_LOCALE)
    })

    expect(container.textContent).toContain(`⟦${MARKER_LOCALE}|ide.tool.read⟧`)
  })
})
