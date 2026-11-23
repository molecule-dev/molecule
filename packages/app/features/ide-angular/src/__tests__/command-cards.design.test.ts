// @vitest-environment jsdom
/**
 * Every command card's ACTIONS must look like buttons.
 *
 * Angular port of `@molecule/app-ide-react/src/__tests__/command-cards.design.test.tsx`
 * with the same test names and the same behavioral assertions, mounted through
 * Angular's own `createApplication` with the theme + http providers. The five
 * cards render through one JIT host (`ngComponentOutlet`) that binds each
 * card's inputs, because Angular's cards take their props as inputs rather than
 * React's JSX props.
 *
 * The owner's words after driving `/test` in production: *"make all of the
 * buttons look like buttons too... be consistent... i thought we had this shit
 * in DESIGN.md and other places"*. The cause was a card rendering its actions
 * with `cm.button({ variant: 'ghost' })` — which resolves to a borderless,
 * transparent box, i.e. a text link.
 *
 * The variants are resolved FROM THE CLASSMAP BOND, never written here as
 * literal class names (molecule AGENTS.md rule 5), so a bond that restyles its
 * buttons keeps this test true.
 *
 * @module
 */

import '@angular/compiler'
import '@molecule/app-framework-conformance/ui/setup'
import { NgComponentOutlet } from '@angular/common'
import {
  type ApplicationRef,
  ChangeDetectionStrategy,
  Component,
  type ComponentRef,
  createComponent,
  provideZonelessChangeDetection,
  type Type,
} from '@angular/core'
import { createApplication } from '@angular/platform-browser'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { provideDomPlacement, provideHttp, provideTheme } from '@molecule/app-angular'
import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { TestItem } from '@molecule/app-ide-panel-logic'
import { EMPTY_RUN_STATE } from '@molecule/app-ide-panel-logic'
import { buildSettingsList } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { TestsCard } from '../components/tests-card.component.js'
import { HelpCard } from '../parts/help-card.component.js'
import { ScriptsCard } from '../parts/scripts-card.component.js'
import { SettingsCard } from '../parts/settings-card.component.js'
import { SkillsCard } from '../parts/skills-card.component.js'
import { buildThemeProvider } from './theme-test-provider.js'

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

/** A full {@link HttpResponse} for a stub to resolve with. */
function responseOf(data: unknown): HttpResponse<never> {
  return {
    data: data as never,
    status: 200,
    statusText: '200',
    headers: {},
    config: { method: 'GET', url: '' },
  }
}

/** An http client that answers each card's own listing and rejects everything else. */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const get = async (url: string): Promise<HttpResponse<never>> => {
    if (url.includes('/scripts')) {
      return responseOf({
        scripts: [{ name: 'seed', description: 'Seed the database.', createdAt: '' }],
      })
    }
    if (url.includes('/files-list')) return responseOf({ files: ['.agents/skills/styling.md'] })
    if (url.includes('/files/')) {
      return responseOf({
        content: [
          '---',
          'name: styling',
          'description: How to style things.',
          '---',
          '',
          '# styling',
        ].join('\n'),
      })
    }
    return responseOf({})
  }
  return {
    baseURL: '',
    defaultHeaders: {},
    request: reject,
    get,
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

/** The inputs the idle failed Tests card renders with (React's `CARDS[0]`). */
const FAILED_TESTS_INPUTS: Record<string, unknown> = {
  tests: TESTS,
  status: 'ready',
  run: {
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
  },
  initialQuery: '',
  canRun: true,
  onRun: () => {},
  onCancel: () => {},
  onFix: () => {},
  fixDisabledReason: null,
  isLight: false,
}

/** One command card, its inputs, and whether it is EXPECTED to render actions. */
interface CardFixture {
  /** The row's `%s` in the sweep's title. */
  name: string
  /** The Angular card class. */
  component: Type<unknown>
  /** The inputs it mounts with. */
  inputs: Record<string, unknown>
  /** Whether the card is EXPECTED to render action buttons. */
  actions: boolean
}

/**
 * Each command card, with fixture data.
 *
 * `actions` records whether the card is EXPECTED to render action buttons, so
 * the sweep cannot pass by rendering nothing. Only Tests and Scripts have any
 * today: Settings' one control is an "Edit" disclosure, Help's are host-supplied
 * upgrade links, and Skills offers a per-row "Load" — none of which is an action
 * by the definition above. All five are still swept, so the day one of them
 * grows a Run/Fix/Save, a ghost one fails here.
 */
const CARDS: CardFixture[] = [
  { name: 'Tests', component: TestsCard, inputs: FAILED_TESTS_INPUTS, actions: true },
  {
    // The SAME card mid-run, because its Stop and its per-row Skip exist only
    // while a run is live — a fixture that is always idle can never see them,
    // and an action nothing renders is an action nothing enforces.
    name: 'Tests (running)',
    component: TestsCard,
    inputs: {
      tests: TESTS,
      status: 'ready',
      run: {
        ...EMPTY_RUN_STATE,
        running: true,
        runId: 'r1',
        queued: ['my-app/app:e2e/home.spec.ts'],
        currentId: 'my-app/app:e2e/home.spec.ts',
        skipUnavailable: false,
      },
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
    inputs: { projectId: 'p', initialQuery: '', isLight: false },
    actions: true,
  },
  {
    name: 'Skills',
    component: SkillsCard,
    inputs: {
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
    inputs: {
      settings: buildSettingsList({
        model: 'a',
        effort: 'b',
        maxLoops: '3',
        autoCommit: 'off',
        autoFix: 'on',
        sounds: 'on',
        timestamps: 'off',
      } as Parameters<typeof buildSettingsList>[0]),
      onRunCommand: () => {},
      isLight: false,
    },
    actions: false,
  },
  { name: 'Help', component: HelpCard, inputs: { isLight: false }, actions: false },
]

/** The JIT host: it renders whichever card the test asked for with its inputs. */
const CommandCardHost = Component({
  selector: 'mol-command-card-host',
  standalone: true,
  imports: [NgComponentOutlet],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `<ng-container *ngComponentOutlet="card; inputs: cardInputs" />`,
})(
  class CommandCardHost {
    /** The card to render. */
    card: Type<unknown> = TestsCard
    /** Its inputs. */
    cardInputs: Record<string, unknown> = {}
  },
)

/** The mount alive right now, if any. */
let current: {
  appRef: ApplicationRef
  container: HTMLElement
} | null = null

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
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
 * Renders one command card with its inputs.
 *
 * @param component - The card class.
 * @param inputs - The inputs to bind.
 * @returns The rendered container.
 */
async function mountCard(
  component: Type<unknown>,
  inputs: Record<string, unknown>,
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
  const ref: ComponentRef<InstanceType<typeof CommandCardHost>> = createComponent(CommandCardHost, {
    environmentInjector: appRef.injector,
  })
  ref.instance.card = component
  ref.instance.cardInputs = inputs
  container.appendChild(ref.location.nativeElement as HTMLElement)
  appRef.attachView(ref.hostView)
  current = { appRef, container }
  await flush()
  return container
}

/**
 * Waits until a card has rendered at least one action button (Scripts lists
 * asynchronously, so its Run only exists once the listing resolves).
 *
 * @param container - The rendered container.
 */
async function waitForActions(container: HTMLElement): Promise<void> {
  for (let attempt = 0; attempt < 100; attempt++) {
    if ([...container.querySelectorAll('button')].filter(isAction).length > 0) return
    await flush()
  }
  throw new Error('the card rendered no action button')
}

/**
 * Renders the idle Tests card with one failed result (React's `CARDS[0]`).
 * @returns The rendered container.
 */
async function renderFailedTests(): Promise<HTMLElement> {
  return mountCard(TestsCard, FAILED_TESTS_INPUTS)
}

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
    { timeout: 60_000 },
    async (name, card) => {
      const container = await mountCard(card.component, card.inputs)
      // Scripts and Skills list asynchronously; their Run/Create buttons only
      // exist once the listing resolves.
      if (card.actions) await waitForActions(container)
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
    const container = await renderFailedTests()
    const ghosts = [...container.querySelectorAll('button')].filter((el) =>
      rendersAs(el, GHOST_VARIANT()),
    )
    expect(ghosts.length).toBeGreaterThan(0)
    for (const ghost of ghosts) {
      expect(ghost.getAttribute('data-mol-id') ?? '').toMatch(/output-toggle|failure-toggle/)
    }
  })
})
