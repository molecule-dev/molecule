// @vitest-environment jsdom

/**
 * Every command card's ACTIONS must look like buttons.
 *
 * A port of `@molecule/app-ide-react`'s `command-cards.design` suite: the same
 * test names and the same behavioral assertions, mounted through Vue's own
 * `createApp` with the http plugin. The sweep renders EVERY command card with
 * fixture data, finds each button that is an ACTION — by its verb, or by a
 * `data-mol-id` carrying `-run-`/`-fix-`/`-skip-` — and asserts it carries a
 * real button variant and NOT the ghost one, so a card cannot drift back to
 * rendering its actions as text links. `ghost` stays legal for
 * dismiss/disclosure controls (Cancel, Show output).
 *
 * The variants are resolved FROM THE CLASSMAP BOND, never written here as
 * literal class names (molecule AGENTS.md rule 5), so a bond that restyles its
 * buttons keeps this test true.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { type Component, createApp, defineComponent, h, nextTick, type VNodeChild } from 'vue'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { TestItem } from '@molecule/app-ide-panel-logic'
import { EMPTY_RUN_STATE, type TestsRunState } from '@molecule/app-ide-panel-logic'
import { buildSettingsList, type SettingsDisplayValues } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'
import { createHttpPlugin } from '@molecule/app-vue'

import { TestsCard } from '../components/TestsCard.js'
import { HelpCard } from '../parts/HelpCard.js'
import { ScriptsCard } from '../parts/ScriptsCard.js'
import { SettingsCard } from '../parts/SettingsCard.js'
import { SkillsCard } from '../parts/SkillsCard.js'

/**
 * Every variant an ACTION may render as — resolved from the bond, not written
 * here. `outline` is deliberately absent: at `xs` on the card surface its
 * 60%-alpha hairline reads as plain text (DESIGN.md → Command cards), so inside
 * a chat card every action is a FILLED button, as ScriptsCard renders its Runs.
 */
const ACTION_VARIANTS = [
  () => classMap.button({ variant: 'solid', color: 'primary', size: 'xs' }),
  () => classMap.button({ variant: 'solid', color: 'secondary', size: 'xs' }),
  () => classMap.button({ variant: 'solid', color: 'success', size: 'xs' }),
  () => classMap.button({ variant: 'solid', color: 'error', size: 'xs' }),
]

/** The variant an action may NEVER render as: borderless, transparent — a text link. */
const GHOST_VARIANT = (): string => classMap.button({ variant: 'ghost', size: 'xs' })

/**
 * Whether an element carries every class of a resolved variant.
 *
 * @param el - The button.
 * @param resolved - A class string from the ClassMap.
 * @returns True when the element renders as that variant.
 */
function rendersAs(el: Element, resolved: string): boolean {
  return resolved
    .split(/\s+/)
    .filter(Boolean)
    .every((token) => el.classList.contains(token))
}

/**
 * Whether a button is an ACTION — something that does work, as opposed to a
 * dismiss or a disclosure toggle.
 *
 * @param el - The button.
 * @returns True when it is an action.
 */
function isAction(el: Element): boolean {
  const molId = el.getAttribute('data-mol-id') ?? ''
  if (molId.includes('-run-') || molId.includes('-fix-') || molId.includes('-skip-')) return true
  const text = (el.textContent ?? '').trim()
  return /^(run|fix|skip|stop|save|apply|create|refresh|retry)\b/i.test(text)
}

const TESTS: TestItem[] = [
  {
    id: 'my-app/app:e2e/home.spec.ts',
    file: 'e2e/home.spec.ts',
    kind: 'e2e',
    workspace: 'my-app/app',
    workspaceLabel: 'my-app/app',
    title: 'home',
  },
]

/** A failing run so the Tests card renders its failed result (and its toggles). */
const FAILED_RUN: TestsRunState = {
  ...EMPTY_RUN_STATE,
  results: {
    'my-app/app:e2e/home.spec.ts': {
      status: 'failed',
      passed: 0,
      failed: 1,
      skipped: 0,
      output: 'boom',
    },
  },
}

/** The SAME card mid-run, the only state that renders its Stop and per-row Skip. */
const RUNNING_RUN: TestsRunState = {
  ...EMPTY_RUN_STATE,
  running: true,
  runId: 'r1',
  queued: ['my-app/app:e2e/home.spec.ts'],
  currentId: 'my-app/app:e2e/home.spec.ts',
  skipUnavailable: false,
}

/** The discovered skill the card lists (one Markdown file under `.agents/skills/`). */
const SKILL_CONTENT = [
  '---',
  'name: styling',
  'description: How to style things.',
  '---',
  '',
  '# styling',
].join('\n')

/** Every display-ready setting value, so the settings list renders in full. */
const SETTINGS_VALUES: SettingsDisplayValues = {
  model: 'a',
  planModel: 'a',
  executeModel: 'a',
  commitModel: 'a',
  compactModel: 'a',
  mode: 'execute',
  effort: 'b',
  maxLoops: '3',
  autoFix: 'on',
  autoCommit: 'off',
  hooks: 'on',
  autoApproveCommands: 'off',
  sounds: 'on',
  timestamps: 'off',
}

/** A typed {@link HttpResponse} wrapper for a resolved value. */
function ok<T>(data: T): HttpResponse<T> {
  return {
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {} as HttpResponse<T>['config'],
  }
}

/** An http client that answers each card's own listing and rejects everything else. */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get: (async (url: string) => {
      if (url.endsWith('/scripts'))
        return ok({ scripts: [{ name: 'seed', description: 'Seed the database.', createdAt: '' }] })
      if (url.endsWith('/files-list')) return ok({ files: ['.agents/skills/styling.md'] })
      if (url.includes('/files/')) return ok({ content: SKILL_CONTENT })
      return ok({})
    }) as HttpClient['get'],
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
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
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
 * Mounts one command card with its own listing served by the stub client.
 *
 * @param component - The card component.
 * @param props - Its props.
 * @returns The host element.
 */
function mountCard(component: Component, props: Record<string, unknown>): HTMLElement {
  mounted.app?.unmount()
  mounted.app = undefined
  document.body.innerHTML = ''
  const host = document.createElement('div')
  document.body.appendChild(host)
  const app = createApp(
    defineComponent({
      render: (): VNodeChild => h(component, props),
    }),
  )
  app.use(createHttpPlugin(buildHttpClient()))
  mounted.app = app
  app.mount(host)
  return host
}

/** One row of the sweep: the card, its fixture props, and whether it must show an action. */
interface CardCase {
  /** The card's name in the test title. */
  name: string
  /** The card component. */
  component: Component
  /** Its fixture props. */
  props: Record<string, unknown>
  /** Whether the card is EXPECTED to render action buttons (so the sweep cannot pass vacuously). */
  actions: boolean
}

/**
 * Each command card, with fixture data.
 *
 * Only Tests and Scripts have actions today: Settings' one control is an
 * "Edit" disclosure, Help's are host-supplied upgrade links, and Skills offers
 * a per-row "Load" and a "Create" form — none of which is an action by the
 * definition above. All five are still swept, so the day one of them grows a
 * Run/Fix/Save, a ghost one fails here.
 */
const CARDS: CardCase[] = [
  {
    name: 'Tests',
    component: TestsCard,
    props: {
      tests: TESTS,
      status: 'ready',
      run: FAILED_RUN,
      initialQuery: '',
      canRun: true,
      onRun: () => {},
      onCancel: () => {},
      onFix: () => {},
      fixDisabledReason: null,
      isLight: false,
    },
    actions: true,
  },
  {
    name: 'Tests (running)',
    component: TestsCard,
    props: {
      tests: TESTS,
      status: 'ready',
      run: RUNNING_RUN,
      initialQuery: '',
      canRun: true,
      onRun: () => {},
      onCancel: () => {},
      onSkipCurrent: () => {},
      onFix: () => {},
      fixDisabledReason: null,
      isLight: false,
    },
    actions: true,
  },
  {
    name: 'Scripts',
    component: ScriptsCard,
    props: { projectId: 'p', initialQuery: '', isLight: false },
    actions: true,
  },
  {
    name: 'Skills',
    component: SkillsCard,
    props: {
      projectId: 'p',
      initialQuery: '',
      onLoad: () => {},
      isLight: false,
      startCreating: true,
    },
    actions: false,
  },
  {
    name: 'Settings',
    component: SettingsCard,
    props: {
      settings: buildSettingsList(SETTINGS_VALUES),
      onRunCommand: () => {},
      isLight: false,
    },
    actions: false,
  },
  { name: 'Help', component: HelpCard, props: { isLight: false }, actions: false },
]

describe('command cards — every action looks like a button', () => {
  it('the ghost variant is genuinely distinguishable from the action variants', () => {
    // If the bond ever made ghost identical to a real variant this test would
    // pass vacuously, so prove the discriminator first.
    const ghost = GHOST_VARIANT()
    for (const variant of ACTION_VARIANTS) {
      expect(variant(), 'an action variant must differ from ghost').not.toBe(ghost)
    }
  })

  it.each(CARDS.map((card) => [card.name, card] as const))(
    '%s card renders no action as a text link',
    async (name, card) => {
      const container = mountCard(card.component, card.props)
      // Scripts and Skills list asynchronously; their Run/Create buttons only
      // exist once the listing resolves.
      if (card.actions) {
        await vi.waitFor(() => {
          expect([...container.querySelectorAll('button')].filter(isAction).length).toBeGreaterThan(
            0,
          )
        })
      }
      const buttons = [...container.querySelectorAll('button')].filter(isAction)
      for (const button of buttons) {
        const label = button.getAttribute('data-mol-id') ?? button.textContent ?? ''
        expect(rendersAs(button, GHOST_VARIANT()), `${name}: "${label}" renders as ghost`).toBe(
          false,
        )
        expect(
          ACTION_VARIANTS.some((variant) => rendersAs(button, variant())),
          `${name}: "${label}" carries no sanctioned button variant`,
        ).toBe(true)
      }
    },
  )

  it('the Tests card uses ghost ONLY for its disclosure toggles', async () => {
    const container = mountCard(TestsCard, {
      tests: TESTS,
      status: 'ready',
      run: FAILED_RUN,
      initialQuery: '',
      canRun: true,
      onRun: () => {},
      onCancel: () => {},
      onFix: () => {},
      fixDisabledReason: null,
      isLight: false,
    })
    await flush()
    const ghosts = [...container.querySelectorAll('button')].filter((el) =>
      rendersAs(el, GHOST_VARIANT()),
    )
    expect(ghosts.length).toBeGreaterThan(0)
    for (const ghost of ghosts) {
      expect(ghost.getAttribute('data-mol-id') ?? '').toMatch(/output-toggle|failure-toggle/)
    }
  })
})
