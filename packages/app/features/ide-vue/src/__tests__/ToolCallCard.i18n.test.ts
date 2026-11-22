// @vitest-environment jsdom
/**
 * The tool-call label goes through i18n at render: `toolLabel` (in
 * `@molecule/app-ide-panel-logic`) emits its English words through `ide.tool.*`
 * keys, and the file names stay data in `` `backtick` `` segments. With a marker
 * translator that names the key, the card's collapsed row must show the marker
 * next to the untouched data segments — and follow a locale switch, because the
 * label is recomputed on every render. A port of `@molecule/app-ide-react`'s
 * `ToolCallCard.i18n.test.tsx` with the same test names and the same behavioral
 * assertions, mounted through Vue's own `createApp`.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import {
  createSimpleI18nProvider,
  type I18nProvider as I18nProviderContract,
  setProvider as setI18nProvider,
} from '@molecule/app-i18n'
import type { ToolCallCardProps } from '@molecule/app-ide-panel-logic'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createThemePlugin } from '@molecule/app-vue'

import { ToolCallCard } from '../components/ToolCallCard.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A second locale the marker translator can switch to. */
const MARKER_LOCALE = 'xx'

/**
 * A provider whose `t` returns `⟦<locale>|<key>⟧` — naming the locale and the
 * key, so a test can prove WHICH key rendered and that a locale switch
 * re-translated the label.
 *
 * @returns The marker provider.
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

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

/**
 * Render a card under the marker provider.
 *
 * @param props - The card's props.
 * @returns The container.
 */
function renderCard(
  props: Partial<ToolCallCardProps> & Pick<ToolCallCardProps, 'id' | 'name' | 'status'>,
): HTMLElement {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(ToolCallCard, props),
    }),
  )
  app.use(createThemePlugin(buildThemeProvider()))
  mounted.app = app
  app.mount(host)
  return host
}

beforeEach(() => {
  setClassMap(classMap)
  // `toolLabel` (panel-logic) translates through the module-level `t`, which
  // reads the GLOBAL provider — bond the marker provider there, and mount the
  // card under the same provider for the component's own reads.
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
})

describe('ToolCallCard labels go through ide.tool.* keys (marker translator)', () => {
  it('renders a read_file label through ide.tool.read with the filename as data', () => {
    const provider = buildMarkerProvider()
    setI18nProvider(provider)
    const container = renderCard({
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
    setI18nProvider(provider)
    const container = renderCard({ id: 't2', name: 'reload_preview', input: {}, status: 'done' })
    expect(container.textContent).toContain('⟦en|ide.tool.reloadPreview⟧')
  })

  it('re-translates the label after a locale switch (the label is computed at render)', async () => {
    const provider = buildMarkerProvider()
    setI18nProvider(provider)
    const container = renderCard({
      id: 't3',
      name: 'read_file',
      input: { path: 'src/index.ts' },
      status: 'done',
    })
    expect(container.textContent).toContain('⟦en|ide.tool.read⟧')

    await provider.setLocale(MARKER_LOCALE)
    await nextTick()

    expect(container.textContent).toContain(`⟦${MARKER_LOCALE}|ide.tool.read⟧`)
  })
})
