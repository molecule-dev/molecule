// @vitest-environment jsdom
/**
 * PKG1 (molecule.dev-leaks-in-core) — agent/product identity wiring guard.
 *
 * Angular port of `@molecule/app-ide-react/src/__tests__/agent-identity.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication`.
 *
 * The MVP audit found the agent name 'Synthase' and product name 'Molecule.dev'
 * hardcoded throughout the shared IDE UI copy, with NO config prop — so any
 * other app embedding the IDE inherited molecule.dev's branding. The fix
 * threads an `agentName` / `productName` input (neutral defaults "the
 * assistant" / "the IDE") and interpolates it into every affected string via
 * the i18n `{{agentName}}` / `{{productName}}` tokens.
 *
 * A source grep or an English-only assertion can't prove the wiring actually
 * reaches the rendered DOM — and the locale bond (which OVERRIDES the inline
 * defaultValue) carried the proper nouns too, so a default-only render would
 * still leak at runtime for every translated locale. This test therefore
 * renders the real {@link SettingsCard} and {@link ReportModal}, then guards
 * the companion locale bond's interpolation tokens.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { provideDomPlacement, provideHttp, provideTheme } from '@molecule/app-angular'
import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { SettingsDisplayValues } from '@molecule/app-ide-panel-logic/panels'
import { buildSettingsList } from '@molecule/app-ide-panel-logic/panels'
import * as ideLocales from '@molecule/app-locales-ide'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { ReportModal } from '../components/report-modal.component.js'
import { SettingsCard } from '../parts/settings-card.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

/** A no-op {@link HttpClient} so the report modal's `useHttpClient()` resolves. */
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

/** The settings values the card renders. */
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

/** The JIT host for the settings card: its template binds every input. */
const SettingsCardHost = Component({
  selector: 'mol-agent-identity-settings-host',
  standalone: true,
  imports: [SettingsCard],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-settings-card [settings]="p['settings']" [onRunCommand]="p['onRunCommand']" [isLight]="p['isLight']" [agentName]="p['agentName']"></div>`,
})(
  class SettingsCardHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The JIT host for the report modal: its template binds every input. */
const ReportModalHost = Component({
  selector: 'mol-agent-identity-report-host',
  standalone: true,
  imports: [ReportModal],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<div mol-report-modal [projectId]="p['projectId']" [onClose]="p['onClose']" [onSubmitted]="p['onSubmitted']" [productName]="p['productName']"></div>`,
})(
  class ReportModalHost {
    /** The props the current mount renders with. */
    p: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  container: HTMLElement
} | null = null

beforeEach(() => {
  setClassMap(classMap)
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  // `t()` resolves against the module-level provider. An empty 'en' provider
  // falls through to the inline `defaultValue` and interpolates the
  // {{agentName}} / {{productName}} tokens from the values argument.
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Angular's zoneless change detection settle. */
async function flush(): Promise<void> {
  if (!current) return
  current.appRef.tick()
  for (let i = 0; i < 3; i++) await Promise.resolve()
  await new Promise((resolve) => setTimeout(resolve, 0))
  current.appRef.tick()
}

/**
 * Mounts a host component with the given props over the theme + http providers.
 *
 * @param host - The JIT host component type.
 * @param props - The props its template binds.
 * @returns The rendered container.
 */
async function mount(
  host: typeof SettingsCardHost | typeof ReportModalHost,
  props: Record<string, unknown>,
): Promise<HTMLElement> {
  if (current) {
    current.appRef.destroy()
    current.container.remove()
    current = null
  }
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  const appRef: ApplicationRef = await createApplication({
    providers: [
      provideZonelessChangeDetection(),
      provideDomPlacement(),
      provideTheme(buildThemeProvider()),
      provideHttp(buildHttpClient()),
    ],
  })
  const ref: ComponentRef<InstanceType<typeof SettingsCardHost | typeof ReportModalHost>> =
    createComponent(host, { environmentInjector: appRef.injector })
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  ref.instance.p = props
  ref.changeDetectorRef.markForCheck()
  current = { appRef, container }
  await flush()
  return container
}

/**
 * Renders the settings card.
 *
 * @param props - Input overrides.
 * @returns The rendered container.
 */
function renderSettings(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  return mount(SettingsCardHost, {
    settings: buildSettingsList(SAMPLE_SETTINGS),
    onRunCommand: () => {},
    isLight: false,
    ...props,
  })
}

/**
 * Renders the report modal.
 *
 * @param props - Input overrides.
 * @returns The rendered container.
 */
function renderReport(props: Record<string, unknown> = {}): Promise<HTMLElement> {
  return mount(ReportModalHost, {
    projectId: 'p1',
    onClose: () => {},
    onSubmitted: () => {},
    ...props,
  })
}

describe('agent identity threads into the IDE chat copy (PKG1)', () => {
  it('renders a host-supplied agentName in the /settings card, never the hardcoded one', async () => {
    const container = await renderSettings({ agentName: 'Fable' })
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
    const container = await renderSettings()
    const text = container.textContent ?? ''
    expect(text).toContain("The model the assistant uses when a mode-specific model isn't set.")
    expect(text).not.toContain('Synthase')
    expect(text).not.toContain('{{agentName}}')
  })

  it('renders a host-supplied productName in the report modal, never the hardcoded one', async () => {
    const container = await renderReport({ productName: 'Acme' })
    const modal = container.ownerDocument.querySelector('[data-mol-id="report-modal"]')
    expect(modal, 'the report modal should mount').not.toBeNull()
    const text = modal?.textContent ?? ''
    expect(text).toContain('Acme’s team')
    // The pre-fix leak: 'Molecule.dev' was hardcoded into the subheading.
    expect(text).not.toContain('Molecule.dev')
    expect(text).not.toContain('{{productName}}')
  })

  it('falls back to the NEUTRAL default product name in the report modal', async () => {
    const container = await renderReport()
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
