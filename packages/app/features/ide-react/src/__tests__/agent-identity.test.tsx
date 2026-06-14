// @vitest-environment jsdom

/**
 * PKG1 (molecule.dev-leaks-in-core) — agent/product identity wiring guard.
 *
 * The MVP audit found the agent name 'Synthase' and product name 'Molecule.dev'
 * hardcoded throughout the shared `@molecule/app-ide-react` / `@molecule/app-react`
 * UI copy, with NO config prop — so any *other* app embedding the IDE inherited
 * molecule.dev's branding. The fix threads an `agentName` / `productName` prop
 * (neutral defaults "the assistant" / "the IDE") and interpolates it into every
 * affected string via the i18n `{{agentName}}` / `{{productName}}` tokens.
 *
 * A source grep or an English-only assertion can't prove the wiring actually
 * reaches the rendered DOM — and the locale bond (which OVERRIDES the inline
 * defaultValue) carried the proper nouns too, so a default-only render would
 * still leak at runtime for every translated locale. This test therefore:
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

import { render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import * as ideLocales from '@molecule/app-locales-ide'
import { HttpProvider, ThemeProvider } from '@molecule/app-react'
import type { Theme, ThemeProvider as ThemeProviderType } from '@molecule/app-theme'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import {
  buildSettingsList,
  type SettingsDisplayValues,
} from '../components/chat-settings-utilities.js'
import { ReportModal } from '../components/ReportModal.js'
import { SettingsCard } from '../components/SettingsCard.js'

/**
 * A ClassMap stub whose every member resolves to its key as a class token, so
 * the components render without depending on a concrete styling bond.
 *
 * @returns A stub {@link UIClassMap}.
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

/**
 * A minimal light {@link ThemeProvider} so {@link ReportModal}'s `useThemeMode`
 * resolves.
 *
 * @returns A stub theme provider.
 */
function buildThemeProvider(): ThemeProviderType {
  const theme: Theme = {
    name: 'light',
    mode: 'light',
    colors: {
      background: { primary: '#ffffff' },
      text: { primary: '#000000' },
      brand: { primary: '#0066cc' },
      semantic: { success: '#00cc00' },
      borders: { default: '#cccccc' },
      overlay: { default: 'rgba(0,0,0,0.5)' },
      shadow: { default: 'rgba(0,0,0,0.1)' },
    },
    breakpoints: {
      mobileS: '320px',
      mobileM: '375px',
      mobileL: '425px',
      tablet: '768px',
      laptop: '1024px',
      laptopL: '1440px',
      desktop: '2560px',
    },
    spacing: {},
    typography: { fontFamily: {}, fontSize: {}, fontWeight: {}, lineHeight: {} },
    borderRadius: {},
    shadows: {},
    transitions: {},
    zIndex: {},
  }
  return {
    getTheme: () => theme,
    getThemeName: () => 'light',
    getThemes: () => ['light', 'dark'],
    setTheme: () => {},
    toggleMode: () => {},
    onThemeChange: () => () => {},
  }
}

const SAMPLE_SETTINGS: SettingsDisplayValues = {
  model: 'Claude Opus 4.6',
  planModel: 'Claude Sonnet 4.6',
  executeModel: 'DeepSeek V4 Flash',
  mode: 'Execute',
  effort: 'Balanced (M)',
  maxLoops: '100',
  autoFix: 'On',
  sounds: '3 of 9 events enabled',
}

/**
 * Wraps children in the contexts {@link ReportModal} reads from.
 * @param root0 - Wrapper props.
 * @param root0.children - The component(s) under test.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return (
    <ThemeProvider provider={buildThemeProvider()}>
      <HttpProvider client={buildHttpClient()}>{children}</HttpProvider>
    </ThemeProvider>
  )
}

beforeEach(() => {
  setClassMap(buildStubClassMap())
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  // `t()` resolves against the module-level provider (not React context). Use an
  // empty 'en' provider so it falls through to the inline `defaultValue` and
  // interpolates the {{agentName}} / {{productName}} tokens from the values arg.
  setProvider(createSimpleI18nProvider('en'))
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('agent identity threads into the IDE chat copy (PKG1)', () => {
  it('renders a host-supplied agentName in the /settings card, never the hardcoded one', () => {
    const { container } = render(
      <SettingsCard
        settings={buildSettingsList(SAMPLE_SETTINGS)}
        onRunCommand={() => {}}
        isLight={false}
        agentName="Fable"
      />,
    )
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
    const { container } = render(
      <SettingsCard
        settings={buildSettingsList(SAMPLE_SETTINGS)}
        onRunCommand={() => {}}
        isLight={false}
      />,
    )
    const text = container.textContent ?? ''
    expect(text).toContain("The model the assistant uses when a mode-specific model isn't set.")
    expect(text).not.toContain('Synthase')
    expect(text).not.toContain('{{agentName}}')
  })

  it('renders a host-supplied productName in the report modal, never the hardcoded one', () => {
    const { container } = render(
      <Wrap>
        <ReportModal projectId="p1" onClose={() => {}} onSubmitted={() => {}} productName="Acme" />
      </Wrap>,
    )
    const modal = container.querySelector('[data-mol-id="report-modal"]')
    expect(modal, 'the report modal should mount').not.toBeNull()
    const text = modal?.textContent ?? ''
    expect(text).toContain('Acme’s team')
    // The pre-fix leak: 'Molecule.dev' was hardcoded into the subheading.
    expect(text).not.toContain('Molecule.dev')
    expect(text).not.toContain('{{productName}}')
  })

  it('falls back to the NEUTRAL default product name in the report modal', () => {
    const { container } = render(
      <Wrap>
        <ReportModal projectId="p1" onClose={() => {}} onSubmitted={() => {}} />
      </Wrap>,
    )
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
