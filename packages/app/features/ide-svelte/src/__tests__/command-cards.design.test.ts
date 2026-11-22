// @vitest-environment jsdom

/**
 * Every command card's ACTIONS must look like buttons.
 *
 * The owner's words after driving `/test` in production: *"make all of the
 * buttons look like buttons too... be consistent"*. The cause was a card
 * rendering its actions with `cm.button({ variant: 'ghost' })` — which resolves
 * to a borderless, transparent box, i.e. a text link. `ghost` stays legal for
 * dismiss/disclosure controls (Cancel, Show output), which is what the sibling
 * cards already use it for.
 *
 * A port of
 * `@molecule/app-ide-react/src/__tests__/command-cards.design.test.tsx` with the
 * same test names and the same assertions, mounted through Svelte 5's own
 * `mount`/`flushSync`. The variants are resolved FROM THE CLASSMAP BOND, never
 * written here as literal class names (molecule AGENTS.md rule 5), so a bond
 * that restyles its buttons keeps this test true.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import { flushSync, mount, unmount } from 'svelte'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { TestItem } from '@molecule/app-ide-panel-logic'
import { EMPTY_RUN_STATE } from '@molecule/app-ide-panel-logic'
import type { SettingsDisplayValues, SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { buildSettingsList } from '@molecule/app-ide-panel-logic/panels'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import TestsCard from '../components/TestsCard.svelte'
import HelpCard from '../parts/HelpCard.svelte'
import SettingsCard from '../parts/SettingsCard.svelte'
import type { TestsCardProps } from '../types.js'
import ScriptsCardHost from './ScriptsCardHost.svelte'
import SkillsCardHost from './SkillsCardHost.svelte'

/**
 * Every variant an ACTION may render as — resolved from the bond, not written
 * here.
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

/** The skill the Skills card discovers (its `.agents/skills/` listing). */
const SKILLS: SkillInfo[] = [
  { path: '.agents/skills/styling/SKILL.md', name: 'styling', description: 'How to style things.' },
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

/** The discovery fixture the Skills card reads its listing and content from. */
const SKILL_FILE = ['---', 'name: styling', 'description: How to style things.', '---', ''].join(
  '\n',
)

/**
 * An http client that answers each card's own listing and nothing else.
 *
 * @returns A stub {@link HttpClient}.
 */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const get = async (url: string): Promise<HttpResponse<never>> => {
    if (url.includes('/scripts'))
      return responseOf({
        scripts: [{ name: 'seed', description: 'Seed the database.', createdAt: '' }],
      })
    if (url.endsWith('/files-list')) return responseOf({ files: SKILLS.map((skill) => skill.path) })
    if (url.includes('/files/')) return responseOf({ content: SKILL_FILE })
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

/** The settings values the Settings card renders (React's fixture values). */
const SETTINGS_VALUES: SettingsDisplayValues = {
  model: 'a',
  planModel: 'a',
  executeModel: 'a',
  commitModel: 'a',
  compactModel: 'a',
  mode: 'Execute',
  effort: 'b',
  maxLoops: '3',
  autoCommit: 'off',
  autoFix: 'on',
  hooks: 'In project settings',
  autoApproveCommands: 'Off',
  sounds: 'on',
  timestamps: 'off',
}

/** The failed-run fixture the Tests sweep renders. */
const FAILED_RUN: TestsCardProps['run'] = {
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

/** The mounts alive right now, torn down before the next test. */
const mounted: { instance: ReturnType<typeof mount>; container: HTMLElement }[] = []

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(async () => {
  for (const { instance, container } of mounted.splice(0)) {
    await unmount(instance)
    container.remove()
  }
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * A fresh, empty container for one card.
 *
 * @returns The element the card may mount into.
 */
function newContainer(): HTMLElement {
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  return container
}

/**
 * Flushes the mount and records it for teardown.
 *
 * @param instance - The mounted component's exports.
 * @param container - The element it mounted into.
 * @returns The same container.
 */
function record(instance: ReturnType<typeof mount>, container: HTMLElement): HTMLElement {
  flushSync()
  mounted.push({ instance, container })
  return container
}

/** The Tests card, failing one e2e test (the React fixture). */
function renderTestsCard(): HTMLElement {
  const container = newContainer()
  const instance = mount(TestsCard, {
    target: container,
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
  })
  return record(instance, container)
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
const CARDS: { name: string; element: () => HTMLElement; actions: boolean }[] = [
  { name: 'Tests', element: renderTestsCard, actions: true },
  {
    // The SAME card mid-run, because its Stop and its per-row Skip exist only
    // while a run is live — a fixture that is always idle can never see them,
    // and an action nothing renders is an action nothing enforces.
    name: 'Tests (running)',
    element: () => {
      const container = newContainer()
      const instance = mount(TestsCard, {
        target: container,
        props: {
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
      })
      return record(instance, container)
    },
    actions: true,
  },
  {
    name: 'Scripts',
    element: () => {
      const container = newContainer()
      const instance = mount(ScriptsCardHost, {
        target: container,
        props: {
          http: buildHttpClient(),
          projectId: 'p',
          initialQuery: '',
          isLight: false,
        },
      })
      return record(instance, container)
    },
    actions: true,
  },
  {
    name: 'Skills',
    element: () => {
      const container = newContainer()
      const instance = mount(SkillsCardHost, {
        target: container,
        props: {
          http: buildHttpClient(),
          projectId: 'p',
          initialQuery: '',
          onLoad: () => {},
          isLight: false,
          startCreating: true,
        },
      })
      return record(instance, container)
    },
    actions: false,
  },
  {
    name: 'Settings',
    element: () => {
      const container = newContainer()
      const instance = mount(SettingsCard, {
        target: container,
        props: {
          settings: buildSettingsList(SETTINGS_VALUES),
          onRunCommand: () => {},
          isLight: false,
        },
      })
      return record(instance, container)
    },
    actions: false,
  },
  {
    name: 'Help',
    element: () => {
      const container = newContainer()
      const instance = mount(HelpCard, { target: container, props: { isLight: false } })
      return record(instance, container)
    },
    actions: false,
  },
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
      const container = card.element()
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

  it('the Tests card uses ghost ONLY for its disclosure toggles', () => {
    const container = renderTestsCard()
    const ghosts = [...container.querySelectorAll('button')].filter((el) =>
      rendersAs(el, GHOST_VARIANT()),
    )
    expect(ghosts.length).toBeGreaterThan(0)
    for (const ghost of ghosts) {
      expect(ghost.getAttribute('data-mol-id') ?? '').toMatch(/output-toggle|failure-toggle/)
    }
  })
})
