// @vitest-environment jsdom

/**
 * cross-cutting-i18n — IDE-shell strings must resolve through the locale bond,
 * not just the inline English `defaultValue`.
 *
 * The MVP audit found new IDE UI strings shipped as `t(key, …, { defaultValue })`
 * inline only, with the key never added to the companion `@molecule/app-locales-ide`
 * bond — so English looked fine while every other locale silently fell back to
 * English. A source grep or an English-only render can't catch this, because the
 * `defaultValue` masks the missing key. This test loads the REAL ide bond's
 * French table into the i18n provider, renders the actual components, and asserts
 * the rendered DOM shows the bonded French translation (not the English default).
 * If the key were missing from the bond, the component would render the English
 * default and these assertions would fail — exactly the gap that shipped.
 *
 * Covers the surfaces synced for this finding: the preview toolbar (PV1 URL bar,
 * PV5 back/forward) and the device-frame cycler tooltip.
 *
 * @module
 */

import { cleanup, fireEvent, render } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { createSimpleI18nProvider, setProvider, t } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import * as ideLocales from '@molecule/app-locales-ide'
import { PreviewProvider as PreviewContextProvider } from '@molecule/app-react'
import { setClassMap, type UIClassMap } from '@molecule/app-ui'

import { AutoCommitBadge } from '../components/AutoCommitBadge.js'
import type { AutoCommitState } from '../components/chat-autocommit-utilities.js'
import { DEVICE_META } from '../components/device-cycle.js'
import { DeviceFrameSelector } from '../components/DeviceFrameSelector.js'
import { PreviewPanel } from '../components/PreviewPanel.js'
import { StreamingIndicator } from '../components/StreamingIndicator.js'

const fr = ideLocales.fr as Record<string, string>
const en = ideLocales.en as Record<string, string>

/**
 * A ClassMap stub whose every member resolves to its key as a class token
 *  (so layout helpers/`cn()` don't depend on a concrete styling bond).
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
      else if (typeof c === 'function') {
        const s = String(c)
        if (s) out.push(s)
      }
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
 * A no-active-preview {@link PreviewProvider} so PreviewPanel renders only its
 *  always-visible toolbar (no iframe/polling/freeze effects).
 */
function buildStubPreviewProvider(): PreviewProvider {
  const state: PreviewState = {
    url: '',
    currentUrl: '',
    isLoading: false,
    device: 'none',
    error: null,
    isConnected: false,
    canGoBack: false,
    canGoForward: false,
    loadNonce: 0,
  }
  const noop = (): void => {}
  return {
    name: 'stub',
    setUrl: noop,
    getUrl: () => state.url,
    refresh: noop,
    setDevice: (_device: DeviceFrame) => {},
    getState: () => state,
    navigateTo: noop,
    recordNavigation: noop,
    back: noop,
    forward: noop,
    canGoBack: () => false,
    canGoForward: () => false,
    subscribe: () => () => {},
    openExternal: noop,
  }
}

/**
 * Wrap children in the preview context PreviewPanel reads from.
 * @param root0 - Wrapper props.
 * @param root0.children - The component(s) under test.
 * @returns The wrapped tree.
 */
function Wrap({ children }: { children: ReactNode }): ReactElement {
  return (
    <PreviewContextProvider provider={buildStubPreviewProvider()}>
      {children}
    </PreviewContextProvider>
  )
}

beforeEach(async () => {
  setClassMap(buildStubClassMap())
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  // The module-level `t()` resolves against the bonded provider (NOT React
  // context), so configure the singleton and load the real bond's fr table.
  const provider = createSimpleI18nProvider('en')
  setProvider(provider)
  provider.addLocale({ code: 'fr', name: 'French' })
  provider.addTranslations('fr', fr)
  await provider.setLocale('fr')
})

afterEach(() => {
  // Unmount the React tree the proper way so the styled Tooltip's portal nodes
  // are removed by React (nuking innerHTML races React's portal unmount).
  cleanup()
})

describe('IDE-shell i18n resolves through the locale bond (cross-cutting-i18n)', () => {
  it('the bond defines the preview + device keys the components render', () => {
    // Guards the merge the audit found missing: the keys must actually exist in
    // the bond, not just as inline defaults.
    for (const key of [
      'ide.preview.back',
      'ide.preview.forward',
      'ide.preview.urlBar',
      'ide.device.tablet',
    ]) {
      expect(typeof fr[key], `${key} missing from app-locales-ide`).toBe('string')
      expect(fr[key].length, `${key} empty in app-locales-ide`).toBeGreaterThan(0)
    }
  })

  it('renders the preview toolbar back/forward tooltips from the bond, not the English default', () => {
    const { container } = render(
      <Wrap>
        <PreviewPanel />
      </Wrap>,
    )
    const back = container.querySelector('[data-mol-id="preview-back"]') as HTMLElement
    const forward = container.querySelector('[data-mol-id="preview-forward"]') as HTMLElement
    // The styled Tooltip replaced the native `title`; the bonded text now shows on
    // hover via the Tooltip's `role="tooltip"` popover (not a `title` attribute).
    expect(back.hasAttribute('title')).toBe(false)
    expect(forward.hasAttribute('title')).toBe(false)

    fireEvent.mouseEnter(back.parentElement as HTMLElement)
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      fr['ide.preview.back'],
    )
    // The pre-fix bug: with the key absent, the default English "Back" rendered.
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).not.toBe('Back')
    fireEvent.mouseLeave(back.parentElement as HTMLElement)

    fireEvent.mouseEnter(forward.parentElement as HTMLElement)
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      fr['ide.preview.forward'],
    )
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).not.toBe('Forward')
    fireEvent.mouseLeave(forward.parentElement as HTMLElement)
  })

  it('renders the device-frame dropdown labels from the bonded locale, not the English default', () => {
    const current: DeviceFrame = 'desktop'
    const { container } = render(
      <Wrap>
        <DeviceFrameSelector current={current} onChange={() => {}} />
      </Wrap>,
    )
    const button = container.querySelector('[data-mol-id="preview-device-cycle"]') as HTMLElement
    // The dropdown trigger uses the styled Tooltip, never a native `title` attr.
    expect(button.hasAttribute('title')).toBe(false)
    // Open the menu and check a frame label resolves through the FRENCH bond.
    fireEvent.click(button)
    const desktopItem = container.querySelector(
      '[data-mol-id="preview-device-option-desktop"]',
    ) as HTMLElement
    expect(desktopItem.textContent).toContain(fr[DEVICE_META.desktop.labelKey])
    // The English default ('Desktop') would render if the bond weren't consulted.
    expect(desktopItem.textContent).not.toContain('Desktop')
  })
})

describe('Synthase chat surface i18n resolves through the locale bond (cross-cutting-i18n)', () => {
  // The chat surface (models table, scripts/skills browsers, effort, share,
  // report, autocommit, activity status, help) shipped ~140 strings as inline
  // defaultValue only — never added to @molecule/app-locales-ide. This block
  // proves the merge: the keys exist in the bond and the components render the
  // bonded translation, including interpolation through the `${x}` → `{{x}}`
  // defaultValue refactor that makes the bond override safe.
  it('the bond defines the chat-surface keys the components render', () => {
    for (const key of [
      'ide.chat.activity.thinking',
      'ide.chat.autoCommit.badge',
      'ide.chat.autoCommit.cancel',
      'ide.chat.effort.header',
      'ide.chat.models.colName',
      'ide.chat.modelRemoved',
      'ide.chat.report.heading',
      'ide.chat.scripts.heading',
      'ide.chat.settings.heading',
      'ide.chat.share.heading',
      'ide.chat.skills.heading',
      'ide.activity.defaultSummary',
    ]) {
      expect(typeof fr[key], `${key} missing from app-locales-ide`).toBe('string')
      expect(fr[key].length, `${key} empty in app-locales-ide`).toBeGreaterThan(0)
    }
  })

  it('renders the auto-commit badge from the bond, interpolated, not the English default', () => {
    const state: AutoCommitState = { intervalSeconds: 30, remaining: 12 }
    const { container } = render(<AutoCommitBadge state={state} onCancel={() => {}} />)
    const badge = container.querySelector('[data-mol-id="chat-autocommit-badge"]')
    expect(badge, 'auto-commit badge did not render').not.toBeNull()

    // The title is the cancel label, resolved from the bond (not the English default).
    expect(badge?.getAttribute('title')).toBe(fr['ide.chat.autoCommit.cancel'])
    expect(badge?.getAttribute('title')).not.toBe('Cancel auto-commit')

    // The aria-label interpolates the live countdown into the BONDED template —
    // this only works because the inline default was refactored from a JS
    // `${countdown}` template literal to an i18n `{{countdown}}` placeholder, so
    // the bond override interpolates the same value the inline default would.
    const expectedBadge = fr['ide.chat.autoCommit.badge'].replace('{{countdown}}', '12s')
    expect(badge?.getAttribute('aria-label')).toBe(
      `${expectedBadge} — ${fr['ide.chat.autoCommit.cancel']}`,
    )
    // The pre-fix bug: with the key absent, the English `Auto-commit in 12s` rendered.
    expect(badge?.getAttribute('aria-label')).not.toContain('Auto-commit in')
    expect(badge?.textContent).toContain('12s')
  })

  it('parks the four DeepL-unsafe command-usage keys as the English fallback (not machine-translated)', () => {
    // These carry literal <arg>/& command syntax that DeepL's XML tag handling
    // rejects and the Google path mangles, so they are intentionally NOT
    // machine-translated. The bond requires every locale to define every key
    // (see the bond's own index.test.ts), so they are present in every locale
    // as the canonical English value — a safe fallback, never a mangled one.
    // Guarding this makes a future real fan-out a conscious change.
    for (const key of [
      'ide.chat.autoCommit.usage',
      'ide.chat.effort.usage',
      'ide.chat.scripts.runUsage',
      'ide.chat.help.tipMention',
    ]) {
      expect(typeof en[key], `${key} missing from en`).toBe('string')
      expect(fr[key], `${key} should be the parked English fallback, not translated`).toBe(en[key])
    }
  })
})

describe('IDE chat/activity i18n debt closed (cross-cutting-i18n, final wave)', () => {
  // The trailing inline-only surfaces from later MVP waves (SYN13 help card,
  // SYN11 settings rows, the streaming indicator, the report-confirmation cards,
  // the PV6 resize sash, and the thinking-duration counter) shipped as inline
  // defaultValue with the key never added to @molecule/app-locales-ide. This
  // block proves they are now in the bond and render the bonded value.
  it('the bond defines every newly-synced chat/activity key', () => {
    for (const key of [
      'ide.chat.streaming.thinking',
      'ide.chat.streaming.analyzing',
      'ide.chat.streaming.almostThere',
      'ide.chat.help.card.heading',
      'ide.chat.help.card.commandsTitle',
      'ide.chat.help.card.modesTitle',
      'ide.chat.help.card.tipsTitle',
      'ide.chat.report.failed',
      'ide.chat.report.submitted',
      'ide.chat.report.submittedWithLink',
      'ide.chat.settings.modelFollowsDefault',
      'ide.chat.settings.effortValue',
      'ide.resizeHandle.label',
      'ide.chat.thoughtForSecond',
      'ide.chat.thoughtForSeconds',
      'ide.chat.thoughtForMinute',
      'ide.chat.thoughtForMinutes',
    ]) {
      expect(typeof fr[key], `${key} missing from app-locales-ide`).toBe('string')
      expect(fr[key].length, `${key} empty in app-locales-ide`).toBeGreaterThan(0)
    }
  })

  it('renders the streaming indicator status from the bonded French, not the English default', () => {
    // No `label` and msgIdx starts at 0, so the indicator deterministically shows
    // MESSAGES[0] = `ide.chat.streaming.thinking`. With the key absent from the
    // bond it would fall back to the English default "Synthesizing..." — the exact gap.
    const { container } = render(<StreamingIndicator />)
    const status = container.querySelector('[role="status"]') as HTMLElement
    expect(status, 'streaming indicator did not render').not.toBeNull()
    expect(status.textContent).toBe(fr['ide.chat.streaming.thinking'])
    expect(status.getAttribute('aria-label')).toBe(fr['ide.chat.streaming.thinking'])
    // The pre-fix bug: with the key absent, the English "Synthesizing..." rendered.
    expect(status.textContent).not.toBe('Synthesizing...')
  })

  it('translates the human chat/help/report copy (not stuck on the English default)', () => {
    // These carry no DeepL-hostile syntax, so they ARE machine-translated; a
    // regression to English-only for these surfaces would fail here.
    for (const key of [
      'ide.chat.streaming.thinking',
      'ide.chat.help.card.heading',
      'ide.chat.report.submittedWithLink',
      'ide.resizeHandle.label',
    ]) {
      expect(fr[key], `${key} should be translated, not the English fallback`).not.toBe(en[key])
    }
  })

  it('the thinking-duration keys interpolate {{count}} through the bond (override-safe split)', () => {
    // The source was refactored off a JS `${seconds} second${...}` template onto
    // the codebase's singular/plural key convention, so each bond value is a clean
    // {{count}} template a bond override can safely interpolate. The {{count}}
    // round-trip is the proof the `${}`→key split landed.
    expect(
      t(
        'ide.chat.thoughtForSeconds',
        { count: 5 },
        { defaultValue: 'Thought for {{count}} seconds' },
      ),
    ).toBe(fr['ide.chat.thoughtForSeconds'].replace('{{count}}', '5'))
    expect(
      t('ide.chat.thoughtForMinute', { count: 1 }, { defaultValue: 'Thought for 1 minute' }),
    ).toBe(fr['ide.chat.thoughtForMinute'])
    // The plural template must carry the placeholder; the singular must not.
    expect(fr['ide.chat.thoughtForSeconds']).toContain('{{count}}')
    expect(fr['ide.chat.thoughtForSecond']).not.toContain('{{count}}')
  })

  it('parks the thinking-duration + help-card usage keys as the English fallback (MT-unsafe)', () => {
    // thoughtFor* is an elliptical "Thought for {{count}}…" fragment DeepL mangles
    // (gluing the masked number into a word); help.card.usageHint carries literal
    // <…>/[…] command-arg syntax DeepL's XML masking can't round-trip. Both are
    // kept as the canonical English value in every locale — honest over mangled.
    for (const key of [
      'ide.chat.thoughtForSecond',
      'ide.chat.thoughtForSeconds',
      'ide.chat.thoughtForMinute',
      'ide.chat.thoughtForMinutes',
      'ide.chat.help.card.usageHint',
    ]) {
      expect(typeof en[key], `${key} missing from en`).toBe('string')
      expect(fr[key], `${key} should be the parked English fallback`).toBe(en[key])
    }
  })
})
