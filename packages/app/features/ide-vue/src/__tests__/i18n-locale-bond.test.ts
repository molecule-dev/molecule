// @vitest-environment jsdom

/**
 * cross-cutting-i18n — IDE-shell strings must resolve through the locale bond,
 * not just the inline English `defaultValue`.
 *
 * A port of `@molecule/app-ide-react`'s `i18n-locale-bond` suite with the same
 * test names and the same assertions, mounted through Vue's own `createApp`.
 * The test loads the REAL ide bond's French table into the i18n provider,
 * renders the actual components, and asserts the rendered DOM shows the bonded
 * French translation (not the English default) — so a key missing from the
 * bond would render the English default and fail here.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import { createSimpleI18nProvider, setProvider, t } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { AutoCommitState, TestList } from '@molecule/app-ide-panel-logic'
import { DEVICE_META, EMPTY_RUN_STATE } from '@molecule/app-ide-panel-logic'
import type { DeviceFrame, PreviewProvider, PreviewState } from '@molecule/app-live-preview'
import * as ideLocales from '@molecule/app-locales-ide'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createPreviewPlugin } from '@molecule/app-vue'

import { DeviceFrameSelector } from '../components/DeviceFrameSelector.js'
import { PreviewPanel } from '../components/PreviewPanel.js'
import { TestsCard } from '../components/TestsCard.js'
import { AutoCommitBadge } from '../parts/AutoCommitBadge.js'
import { StreamingIndicator } from '../parts/StreamingIndicator.js'

const fr = ideLocales.fr as Record<string, string>
const en = ideLocales.en as Record<string, string>

/**
 * A no-active-preview {@link PreviewProvider} so PreviewPanel renders only its
 * always-visible toolbar (no iframe/polling/freeze effects).
 *
 * @returns A stub PreviewProvider.
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

/** The app this file last mounted, unmounted before the next render. */
const mounted: { app?: ReturnType<typeof createApp> } = {}

beforeEach(async () => {
  setClassMap(classMap)
  // Any glyph resolves to an empty path set — Icon only needs a defined entry.
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
  // The module-level `t()` resolves against the bonded provider (which
  // `useTranslation` falls back to when no i18n plugin is installed), so
  // configure the singleton and load the real bond's fr table.
  const provider = createSimpleI18nProvider('en')
  setProvider(provider)
  provider.addLocale({ code: 'fr', name: 'French' })
  provider.addTranslations('fr', fr)
  await provider.setLocale('fr')
})

afterEach(() => {
  // Unmount the proper way so a Tooltip's portal nodes are removed by Vue.
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/** Lets Vue settle the render (and the render a state change queued). */
async function settle(): Promise<void> {
  for (let i = 0; i < 4; i++) {
    await nextTick()
    await Promise.resolve()
  }
}

/**
 * Mounts a component standalone, with only the plugins it needs.
 *
 * @param component - The Vue component.
 * @param props - Its props.
 * @param provider - The live-preview provider (PreviewPanel needs one).
 * @returns The host element.
 */
function mount(
  component: Parameters<typeof h>[0],
  props: Record<string, unknown> = {},
  provider?: PreviewProvider,
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
  if (provider) app.use(createPreviewPlugin(provider))
  mounted.app = app
  app.mount(host)
  return host
}

/**
 * Hovers a control's Tooltip trigger and flushes the tooltip's mount render.
 *
 * @param el - The control element (the tooltip wraps it in a trigger).
 */
async function hover(el: Element): Promise<void> {
  el.parentElement?.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }))
  await settle()
}

/**
 * Leaves a control's Tooltip trigger and waits out its delayed hide.
 *
 * @param el - The control element.
 */
async function unhover(el: Element): Promise<void> {
  el.parentElement?.dispatchEvent(new MouseEvent('mouseout', { bubbles: true }))
  // The Vue Tooltip hides on a 150ms grace timer, then re-renders on the tick.
  await new Promise((resolve) => setTimeout(resolve, 200))
  await settle()
}

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

  it('renders the preview toolbar back/forward tooltips from the bond, not the English default', async () => {
    const container = mount(PreviewPanel, {}, buildStubPreviewProvider())
    await settle()
    const back = container.querySelector('[data-mol-id="preview-back"]') as HTMLElement
    const forward = container.querySelector('[data-mol-id="preview-forward"]') as HTMLElement
    // The styled Tooltip replaced the native `title`; the bonded text now shows on
    // hover via the Tooltip's `role="tooltip"` popover (not a `title` attribute).
    expect(back.hasAttribute('title')).toBe(false)
    expect(forward.hasAttribute('title')).toBe(false)

    await hover(back)
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      fr['ide.preview.back'],
    )
    // The pre-fix bug: with the key absent, the default English "Back" rendered.
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).not.toBe('Back')
    await unhover(back)
    expect(document.body.querySelector('[role="tooltip"]')).toBeNull()

    await hover(forward)
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toBe(
      fr['ide.preview.forward'],
    )
    expect(document.body.querySelector('[role="tooltip"]')?.textContent).not.toBe('Forward')
    await unhover(forward)
  })

  it('renders the device-frame dropdown labels from the bonded locale, not the English default', async () => {
    const current: DeviceFrame = 'desktop'
    const container = mount(DeviceFrameSelector, { current, onChange: () => {} })
    await settle()
    const button = container.querySelector('[data-mol-id="preview-device-cycle"]') as HTMLElement
    // The dropdown trigger uses the styled Tooltip, never a native `title` attr.
    expect(button.hasAttribute('title')).toBe(false)
    // Open the menu and check a frame label resolves through the FRENCH bond.
    button.click()
    await settle()
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
      'ide.chat.commit',
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

  it('renders the auto-commit button from the bond, interpolated, not the English default', async () => {
    // In its final visible window the button shows the live countdown label.
    const state: AutoCommitState = { intervalSeconds: 5, remaining: 2 }
    const container = mount(AutoCommitBadge, { state, onCommitNow: () => {} })
    await settle()
    const badge = container.querySelector('[data-mol-id="chat-autocommit-badge"]')
    expect(badge, 'auto-commit button did not render').not.toBeNull()

    // The title is the commit label (click = commit now), resolved from the bond.
    expect(badge?.getAttribute('title')).toBe(fr['ide.chat.commit'])
    expect(badge?.getAttribute('title')).not.toBe('Commit')

    // The visible text + aria-label interpolate the live countdown into the
    // BONDED template — this only works because the inline default was
    // refactored from a JS `${countdown}` template literal to an i18n
    // `{{countdown}}` placeholder, so the bond override interpolates the same
    // value the inline default would.
    const expectedBadge = fr['ide.chat.autoCommit.badge'].replace('{{countdown}}', '2s')
    expect(badge?.textContent).toBe(expectedBadge)
    expect(badge?.getAttribute('aria-label')).toBe(`${expectedBadge} — ${fr['ide.chat.commit']}`)
    // The pre-fix bug: with the key absent, the English `Auto-commit in 2s` rendered.
    expect(badge?.getAttribute('aria-label')).not.toContain('Auto-commit in')

    // Outside the visible window (quiet phase) the button is the bonded commit label.
    const quiet = mount(AutoCommitBadge, {
      state: { intervalSeconds: 30, remaining: 12 },
      onCommitNow: () => {},
    })
    await settle()
    expect(quiet.querySelector('[data-mol-id="chat-autocommit-badge"]')?.textContent).toBe(
      fr['ide.chat.commit'],
    )
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

  it('renders the streaming indicator status from the bonded French, not the English default', async () => {
    // No `label` and msgIdx starts at 0, so the indicator deterministically shows
    // MESSAGES[0] = `ide.chat.streaming.thinking`. With the key absent from the
    // bond it would fall back to the English default "Synthesizing..." — the exact gap.
    const container = mount(StreamingIndicator)
    await settle()
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

describe('Tests card i18n resolves through the locale bond (cross-cutting-i18n)', () => {
  /** Two tests, one of each kind, in two project directories. */
  const TESTS: TestList['tests'] = [
    {
      id: 'my-app/app:e2e/home.spec.ts',
      file: 'e2e/home.spec.ts',
      kind: 'e2e',
      workspace: 'my-app/app',
      workspaceLabel: 'my-app/app',
      title: 'home',
    },
    {
      id: 'my-app/api:src/routes.test.ts',
      file: 'src/routes.test.ts',
      kind: 'unit',
      workspace: 'my-app/api',
      workspaceLabel: 'my-app/api',
      title: 'routes',
    },
  ]

  /**
   * Render the card the way ChatPanel does.
   *
   * @param canRun - Whether the viewer may run tests.
   * @returns The rendered container.
   */
  const renderCard = (canRun = true): HTMLElement =>
    mount(TestsCard, {
      tests: TESTS,
      status: 'ready',
      run: EMPTY_RUN_STATE,
      initialQuery: '',
      canRun,
      onRun: () => {},
      onCancel: () => {},
      onFix: () => {},
      fixDisabledReason: null,
      isLight: false,
    })

  it('the bond defines every ide.tests.* key the card renders', () => {
    for (const key of [
      'ide.tests.heading',
      'ide.tests.searchPlaceholder',
      'ide.tests.loading',
      'ide.tests.waitingForSandbox',
      'ide.tests.empty',
      'ide.tests.noMatch',
      'ide.tests.run',
      'ide.tests.runAll',
      'ide.tests.runE2e',
      'ide.tests.runUnit',
      'ide.tests.runGroup',
      'ide.tests.stop',
      'ide.tests.running',
      'ide.tests.passedCount',
      'ide.tests.failedCount',
      'ide.tests.statusPassed',
      'ide.tests.statusFailed',
      'ide.tests.statusSkipped',
      'ide.tests.kind.e2e',
      'ide.tests.kind.unit',
      'ide.tests.workspace.root',
      'ide.tests.cancelled',
      'ide.tests.listError',
      'ide.tests.runError',
      'ide.tests.viewerCannotRun',
      'ide.tests.needsSandbox',
    ]) {
      expect(typeof fr[key], `${key} missing from app-locales-ide`).toBe('string')
      expect(fr[key].length, `${key} empty in app-locales-ide`).toBeGreaterThan(0)
    }
  })

  it('the card’s sentences are really TRANSLATED, not the English value copied in', () => {
    // Scoped to keys whose French genuinely differs — 'API' is 'API' in most
    // languages, and a one-word label can legitimately round-trip unchanged, so
    // asserting that on EVERY key would be asserting a false premise.
    for (const key of [
      'ide.tests.searchPlaceholder',
      'ide.tests.loading',
      'ide.tests.empty',
      'ide.tests.noMatch',
      'ide.tests.runAll',
      'ide.tests.running',
      'ide.tests.statusPassed',
      'ide.tests.kind.e2e',
      'ide.tests.listError',
      'ide.tests.viewerCannotRun',
      'ide.tests.needsSandbox',
    ]) {
      expect(fr[key], `${key} should be translated, not the English fallback`).not.toBe(en[key])
    }
  })

  it('the count keys keep {{count}} intact so the card can interpolate them', () => {
    for (const key of ['ide.tests.testCount', 'ide.tests.passedCount', 'ide.tests.failedCount']) {
      expect(fr[key], `${key} lost its {{count}} placeholder`).toContain('{{count}}')
      expect(fr[key], `${key} has a leftover <x> mask`).not.toContain('<x>')
    }
  })

  it('renders the card’s labels from the bonded locale, not the English defaults', async () => {
    const container = renderCard()
    await settle()
    expect(container.querySelector('[data-mol-id="tests-card-run-all"]')?.textContent).toBe(
      fr['ide.tests.runAll'],
    )
    // The pre-fix bug: with the key absent, the English default would render.
    expect(container.querySelector('[data-mol-id="tests-card-run-all"]')?.textContent).not.toBe(
      'Run all',
    )
    expect(
      container.querySelector('[data-mol-id="tests-card-search"]')?.getAttribute('placeholder'),
    ).toBe(fr['ide.tests.searchPlaceholder'])
    expect(
      container.querySelector('[data-mol-id="tests-card-group-e2e-my-app/app"]')?.textContent,
    ).toContain(fr['ide.tests.kind.e2e'])
    // Old locale tables can still contain the preview-only instruction. The
    // card must not bring that requirement back when translations are loaded.
    expect(container.querySelector('[data-mol-id="tests-card-e2e-hint"]')).toBeNull()
  })

  it('renders the viewer’s reason from the bonded locale', async () => {
    const container = renderCard(false)
    await settle()
    expect(container.querySelector('[data-mol-id="tests-card-disabled-reason"]')?.textContent).toBe(
      fr['ide.tests.viewerCannotRun'],
    )
  })
})
