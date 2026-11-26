// @vitest-environment jsdom

/**
 * PKG1 (molecule.dev-leaks-in-core) — agent/product identity wiring guard.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/agent-identity.test.tsx`
 * with the same test names and the same assertions, mounted as real Solid
 * roots: the host-supplied `agentName` / `productName` reach the rendered DOM
 * (and the neutral defaults do, with no 'Synthase' / 'Molecule.dev'), and the
 * companion locale bond carries the `{{agentName}}` / `{{productName}}`
 * interpolation tokens instead of the proper nouns.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { ServiceCallSink } from '@molecule/app-framework-conformance/ui'
import { createFakeThemeProvider } from '@molecule/app-framework-conformance/ui'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { buildSettingsList, type SettingsDisplayValues } from '@molecule/app-ide-panel-logic/panels'
import * as ideLocales from '@molecule/app-locales-ide'
import { MoleculeProvider } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ReportModal } from '../components/ReportModal.jsx'
import { SettingsCard } from '../parts/SettingsCard.jsx'

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

/** A no-op service-call sink for the fake theme provider. */
const sink: ServiceCallSink = () => {}

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

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  // `t()` resolves against the module-level provider. Use an empty 'en'
  // provider so it falls through to the inline `defaultValue` and interpolates
  // the {{agentName}} / {{productName}} tokens from the values arg.
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts the `/settings` card.
 *
 * @param agentName - The host-supplied agent name, when any.
 * @returns The mounted container.
 */
function renderSettings(agentName?: string): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <SettingsCard
        settings={buildSettingsList(SAMPLE_SETTINGS)}
        onRunCommand={() => {}}
        isLight={false}
        agentName={agentName}
      />
    ),
    container,
  )
  return container
}

/**
 * Mounts the report modal under the contexts it reads from.
 *
 * @param productName - The host-supplied product name, when any.
 * @returns The mounted container.
 */
function renderReport(productName?: string): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => (
      <MoleculeProvider http={buildHttpClient()} theme={createFakeThemeProvider('light', sink)}>
        <ReportModal
          projectId="p1"
          onClose={() => {}}
          onSubmitted={() => {}}
          productName={productName}
        />
      </MoleculeProvider>
    ),
    container,
  )
  return container
}

describe('agent identity threads into the IDE chat copy (PKG1)', () => {
  it('renders a host-supplied agentName in the /settings card, never the hardcoded one', () => {
    const text = renderSettings('Fable').textContent ?? ''
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
    const text = renderSettings().textContent ?? ''
    expect(text).toContain("The model the assistant uses when a mode-specific model isn't set.")
    expect(text).not.toContain('Synthase')
    expect(text).not.toContain('{{agentName}}')
  })

  it('renders a host-supplied productName in the report modal, never the hardcoded one', () => {
    const container = renderReport('Acme')
    const modal = container.ownerDocument.querySelector('[data-mol-id="report-modal"]')
    expect(modal, 'the report modal should mount').not.toBeNull()
    const text = modal?.textContent ?? ''
    expect(text).toContain('Acme’s team')
    // The pre-fix leak: 'Molecule.dev' was hardcoded into the subheading.
    expect(text).not.toContain('Molecule.dev')
    expect(text).not.toContain('{{productName}}')
  })

  it('falls back to the NEUTRAL default product name in the report modal', () => {
    const container = renderReport()
    const text =
      container.ownerDocument.querySelector('[data-mol-id="report-modal"]')?.textContent ?? ''
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
