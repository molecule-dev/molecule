// @vitest-environment jsdom

/**
 * PKG1 (molecule.dev-leaks-in-core) — agent/product identity wiring guard.
 *
 * The MVP audit found the agent name 'Synthase' and product name 'Molecule.dev'
 * hardcoded throughout the shared IDE UI copy, with NO config prop — so any
 * other app embedding the IDE inherited molecule.dev's branding. The fix
 * threads an `agentName` / `productName` prop (neutral defaults "the assistant"
 * / "the IDE") and interpolates it into every affected string via the i18n
 * `{{agentName}}` / `{{productName}}` tokens.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/agent-identity.test.tsx` with
 * the same test names and the same assertions, mounted through Svelte 5's own
 * `mount`/`flushSync`. This test therefore:
 *   1. renders the real {@link SettingsCard} and asserts a host-supplied agent
 *      name reaches the DOM (and the neutral default does, with no 'Synthase');
 *   2. renders the real {@link ReportModal} and asserts a host-supplied product
 *      name reaches the DOM (with no 'Molecule.dev');
 *   3. guards the companion locale bond: the three keys that carried the proper
 *      nouns now carry the interpolation token instead, so the runtime override
 *      can't re-introduce the leak.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { SettingsDisplayValues } from '@molecule/app-ide-panel-logic/panels'
import { buildSettingsList } from '@molecule/app-ide-panel-logic/panels'
import * as ideLocales from '@molecule/app-locales-ide'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import SettingsCard from '../parts/SettingsCard.svelte'
import type { SettingsCardProps } from '../types.js'
import ReportModalHost from './ReportModalHost.svelte'
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

/** The mounts alive right now, torn down before the next render. */
const mounted: { instance: Record<string, unknown>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  // `t()` resolves against the module-level provider when no context publishes
  // one. Use an empty 'en' provider so it falls through to the inline
  // `defaultValue` and interpolates the {{agentName}} / {{productName}} tokens.
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance as never)
    container.remove()
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the settings card the way the chat panel does.
 *
 * @param overrides - Props to override.
 * @returns The container the card rendered into.
 */
function renderSettingsCard(overrides: Partial<SettingsCardProps> = {}): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const props: SettingsCardProps = {
    settings: buildSettingsList(SAMPLE_SETTINGS),
    onRunCommand: () => {},
    isLight: false,
    ...overrides,
  }
  const instance = mount(SettingsCard, { target: container, props }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
  return container
}

/**
 * Mounts the report modal under the theme and http contexts it reads.
 *
 * @param productName - The host-supplied product name, if any.
 * @returns The container the modal rendered into.
 */
function renderReportModal(productName?: string): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const instance = mount(ReportModalHost, {
    target: container,
    props: {
      theme: buildThemeProvider(),
      http: buildHttpClient(),
      projectId: 'p1',
      onClose: () => {},
      onSubmitted: () => {},
      ...(productName === undefined ? {} : { productName }),
    },
  }) as Record<string, unknown>
  flushSync()
  mounted.push({ instance, container })
  return container
}

describe('agent identity threads into the IDE chat copy (PKG1)', () => {
  it('renders a host-supplied agentName in the /settings card, never the hardcoded one', () => {
    const container = renderSettingsCard({ agentName: 'Fable' })
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

  it('falls back to the NEUTRAL default agent name when the host supplies none', () => {
    const container = renderSettingsCard()
    const text = container.textContent ?? ''
    expect(text).toContain("The model the assistant uses when a mode-specific model isn't set.")
    expect(text).not.toContain('Synthase')
    expect(text).not.toContain('{{agentName}}')
  })

  it('renders a host-supplied productName in the report modal, never the hardcoded one', () => {
    const container = renderReportModal('Acme')
    const modal = container.querySelector('[data-mol-id="report-modal"]')
    expect(modal, 'the report modal should mount').not.toBeNull()
    const text = modal?.textContent ?? ''
    expect(text).toContain('Acme’s team')
    // The pre-fix leak: 'Molecule.dev' was hardcoded into the subheading.
    expect(text).not.toContain('Molecule.dev')
    expect(text).not.toContain('{{productName}}')
  })

  it('falls back to the NEUTRAL default product name in the report modal', () => {
    const container = renderReportModal()
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
  const en = ideLocales.en as Record<string, string>
  const fr = ideLocales.fr as Record<string, string>

  for (const [label, table] of [
    ['en', en],
    ['fr', fr],
  ] as const) {
    it(`[${label}] soundEventDesc + version use {{agentName}} / {{productName}}`, () => {
      for (const key of [
        'ide.chat.soundEventDesc.done',
        'ide.chat.soundEventDesc.commit_suggestion',
      ]) {
        expect(typeof table[key], `${key} missing from app-locales-ide`).toBe('string')
        expect(table[key]).toContain('{{agentName}}')
        expect(table[key]).not.toContain('Synthase')
      }
      expect(table['ide.chat.version']).toContain('{{productName}}')
      expect(table['ide.chat.version']).not.toContain('Molecule.dev')
    })
  }
})
