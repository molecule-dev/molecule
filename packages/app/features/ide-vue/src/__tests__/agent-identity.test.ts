// @vitest-environment jsdom

/**
 * PKG1 (molecule.dev-leaks-in-core) — agent/product identity wiring guard.
 *
 * A port of `@molecule/app-ide-react`'s `agent-identity` suite with the same
 * test names and the same assertions, mounted through Vue's own `createApp`.
 *
 * The fix threads an `agentName` / `productName` prop (neutral defaults "the
 * assistant" / "the IDE") and interpolates it into every affected string via
 * the i18n `{{agentName}}` / `{{productName}}` tokens. This test renders the
 * real {@link SettingsCard} and {@link ReportModal} and guards the companion
 * locale bond, so a host-supplied name reaches the DOM and the neutral default
 * does with no proper noun.
 *
 * @module
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { SettingsDisplayValues } from '@molecule/app-ide-panel-logic/panels'
import { buildSettingsList } from '@molecule/app-ide-panel-logic/panels'
import * as ideLocales from '@molecule/app-locales-ide'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createHttpPlugin, createThemePlugin } from '@molecule/app-vue'

import { ReportModal } from '../components/ReportModal.js'
import type { SettingsCardProps } from '../parts/SettingsCard.js'
import { SettingsCard } from '../parts/SettingsCard.js'
import { buildThemeProvider } from './theme-test-provider.js'

const SAMPLE_SETTINGS: SettingsDisplayValues = {
  model: 'Claude Opus 4.6',
  planModel: 'Claude Sonnet 4.6',
  executeModel: 'DeepSeek V4 Flash',
  commitModel: 'Fast default',
  compactModel: 'Fast default',
  mode: 'Execute',
  effort: 'Balanced (M)',
  maxLoops: '100',
  autoFix: 'On',
  autoCommit: 'Every 60s',
  hooks: 'In project settings',
  autoApproveCommands: 'Off',
  sounds: '3 of 9 events enabled',
  timestamps: 'Off',
}

/**
 * A no-op {@link HttpClient} so {@link ReportModal}'s `useHttpClient()` resolves
 * (the modal only fetches on submit, which this test does not trigger).
 *
 * @returns A stub HTTP client.
 */
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

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  // `t()` resolves against the module-level provider. Use an empty 'en'
  // provider so it falls through to the inline `defaultValue` and interpolates
  // the {{agentName}} / {{productName}} tokens from the values arg.
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Vue flush the render a state change queued. */
async function flush(): Promise<void> {
  await nextTick()
  await nextTick()
}

/**
 * Mounts a component standalone and hands back its host.
 *
 * @param component - The Vue component to render.
 * @param props - Its props.
 * @param withTheme - Whether to register the theme plugin (the modal needs it).
 * @returns The host element.
 */
function mount(
  component: Parameters<typeof h>[0],
  props: Record<string, unknown>,
  withTheme = false,
): HTMLElement {
  mounted.app?.unmount()
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(component, props),
    }),
  )
  if (withTheme) app.use(createThemePlugin(buildThemeProvider()))
  app.use(createHttpPlugin(buildHttpClient()))
  mounted.app = app
  app.mount(host)
  return host
}

describe('agent identity threads into the IDE chat copy (PKG1)', () => {
  it('renders a host-supplied agentName in the /settings card, never the hardcoded one', async () => {
    const container = mount(SettingsCard, {
      settings: buildSettingsList(SAMPLE_SETTINGS),
      onRunCommand: () => {},
      isLight: false,
      agentName: 'Fable',
    } satisfies SettingsCardProps)
    await flush()
    const text = container.textContent ?? ''
    // The model-setting description interpolates the supplied agent name…
    expect(text).toContain("The model Fable uses when a mode-specific model isn't set.")
    // …and so does the /settings command description in the command reference.
    expect(text).toContain("View & change Fable's settings")
    // The pre-fix leak: 'Synthase' was hardcoded into these strings.
    expect(text).not.toContain('Synthase')
    // No un-substituted interpolation token leaks into the DOM.
    expect(text).not.toContain('{{agentName}}')
  })

  it('falls back to the NEUTRAL default agent name when the host supplies none', async () => {
    const container = mount(SettingsCard, {
      settings: buildSettingsList(SAMPLE_SETTINGS),
      onRunCommand: () => {},
      isLight: false,
    } satisfies SettingsCardProps)
    await flush()
    const text = container.textContent ?? ''
    expect(text).toContain("The model the assistant uses when a mode-specific model isn't set.")
    expect(text).not.toContain('Synthase')
    expect(text).not.toContain('{{agentName}}')
  })

  it('renders a host-supplied productName in the report modal, never the hardcoded one', async () => {
    const container = mount(
      ReportModal,
      { projectId: 'p1', onClose: () => {}, onSubmitted: () => {}, productName: 'Acme' },
      true,
    )
    await flush()
    const modal = container.querySelector('[data-mol-id="report-modal"]')
    expect(modal, 'the report modal should mount').not.toBeNull()
    const text = modal?.textContent ?? ''
    expect(text).toContain('Acme’s team')
    // The pre-fix leak: 'Molecule.dev' was hardcoded into the subheading.
    expect(text).not.toContain('Molecule.dev')
    expect(text).not.toContain('{{productName}}')
  })

  it('falls back to the NEUTRAL default product name in the report modal', async () => {
    const container = mount(
      ReportModal,
      { projectId: 'p1', onClose: () => {}, onSubmitted: () => {} },
      true,
    )
    await flush()
    const text = container.querySelector('[data-mol-id="report-modal"]')?.textContent ?? ''
    expect(text).toContain('the IDE’s team')
    expect(text).not.toContain('Molecule.dev')
  })
})

describe('companion locale bond carries the interpolation token, not the product tell (PKG1)', () => {
  // The locale entry OVERRIDES the inline defaultValue, so if these kept the
  // proper nouns the leak would survive at runtime for every translated locale
  // even with the source-level fix. Guard both the reference (en) and a
  // translated (fr) table.
  const tables = [
    ['en', ideLocales.en],
    ['fr', ideLocales.fr],
  ] as const

  for (const [label, table] of tables) {
    it(`[${label}] soundEventDesc + version use {{agentName}} / {{productName}}`, () => {
      for (const key of [
        'ide.chat.soundEventDesc.done',
        'ide.chat.soundEventDesc.commit_suggestion',
      ] as const) {
        const value: string | undefined = table[key]
        expect(typeof value, `${key} missing from app-locales-ide`).toBe('string')
        expect(value ?? '').toContain('{{agentName}}')
        expect(value ?? '').not.toContain('Synthase')
      }
      const version: string | undefined = table['ide.chat.version']
      expect(version ?? '').toContain('{{productName}}')
      expect(version ?? '').not.toContain('Molecule.dev')
    })
  }
})
