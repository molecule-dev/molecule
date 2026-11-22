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
 * A port of `@molecule/app-ide-react/src/__tests__/ToolCallCard.i18n.test.tsx`
 * with the same test names and the same assertions, mounted through Svelte 5's
 * own `mount`/`flushSync`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { type ComponentProps, flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  createSimpleI18nProvider,
  type I18nProvider,
  setProvider as setI18nProvider,
} from '@molecule/app-i18n'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { buildThemeProvider } from './theme-test-provider.js'
import ToolCallCardHost from './ToolCallCardHost.svelte'

/** A second locale the marker translator can switch to. */
const MARKER_LOCALE = 'xx'

/**
 * A provider whose `t` returns `⟦<locale>|<key>⟧` — naming the locale and the
 * key, so a test can prove WHICH key rendered and that a locale switch
 * re-translated the label.
 *
 * @returns The marker provider.
 */
function buildMarkerProvider(): I18nProvider {
  const base = createSimpleI18nProvider('en', [
    { code: 'en', name: 'English', direction: 'ltr', translations: {} },
    { code: MARKER_LOCALE, name: 'Marker', direction: 'ltr', translations: {} },
  ])
  return {
    ...base,
    t: (key) => `⟦${base.getLocale()}|${key}⟧`,
  }
}

/** The mounts alive right now, torn down before the next test. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  document.body.innerHTML = ''
  setI18nProvider(createSimpleI18nProvider())
})

/**
 * Render one tool call under the given translator provider.
 *
 * @param provider - The i18n provider the card translates through.
 * @param overrides - Props to override.
 * @returns The container.
 */
function renderCard(
  provider: I18nProvider,
  overrides: Omit<ComponentProps<typeof ToolCallCardHost>, 'theme'>,
): HTMLElement {
  // `toolLabel` (panel-logic) translates through the function the card passes
  // it, which reads the GLOBAL provider — bond the marker provider there, and
  // mount the card under the same provider for the component's own reads.
  setI18nProvider(provider)
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(ToolCallCardHost, {
    target: container,
    props: { theme: buildThemeProvider(), ...overrides },
  }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
  return container
}

describe('ToolCallCard labels go through ide.tool.* keys (marker translator)', () => {
  it('renders a read_file label through ide.tool.read with the filename as data', () => {
    const provider = buildMarkerProvider()
    const container = renderCard(provider, {
      id: 't1',
      name: 'read_file',
      input: { path: 'src/index.ts' },
      status: 'done',
    })

    const text = container.textContent ?? ''
    expect(text).toContain('⟦en|ide.tool.read⟧')
    // The filename stays a data segment, untouched by the marker translator.
    expect(text).toContain('index.ts')
    expect(text).not.toContain('⟦index.ts⟧')
  })

  it('renders a sentence-shaped label through its key', () => {
    const provider = buildMarkerProvider()
    const container = renderCard(provider, {
      id: 't2',
      name: 'reload_preview',
      input: {},
      status: 'done',
    })
    expect(container.textContent).toContain('⟦en|ide.tool.reloadPreview⟧')
  })

  it('re-translates the label after a locale switch (the label is computed at render)', async () => {
    const provider = buildMarkerProvider()
    const container = renderCard(provider, {
      id: 't3',
      name: 'read_file',
      input: { path: 'src/index.ts' },
      status: 'done',
    })
    expect(container.textContent).toContain('⟦en|ide.tool.read⟧')

    await provider.setLocale(MARKER_LOCALE)
    flushSync()

    expect(container.textContent).toContain(`⟦${MARKER_LOCALE}|ide.tool.read⟧`)
  })
})
