// @vitest-environment jsdom

/**
 * Every command card's ACTIONS must look like buttons.
 *
 * A port of `@molecule/app-ide-react/src/__tests__/command-cards.design.test.tsx`
 * with the same test names and the same assertions: it renders each command
 * card with fixture data, finds every button that is an ACTION — by its verb,
 * or by a `data-mol-id` carrying `-run-`/`-fix-` — and asserts it carries a
 * real button variant and NOT the ghost one. `ghost` stays legal for
 * dismiss/disclosure controls (Cancel, Show output), which is what the sibling
 * cards already use it for.
 *
 * The variants are resolved FROM THE CLASSMAP BOND, never written here as
 * literal class names (molecule AGENTS.md rule 5), so a bond that restyles its
 * buttons keeps this test true.
 *
 * @module
 */

import '@molecule/app-framework-conformance/ui/setup'
import type { JSX } from 'solid-js'
import { render } from 'solid-js/web'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { HttpClient, HttpResponse } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import type { TestItem } from '@molecule/app-ide-panel-logic'
import { EMPTY_RUN_STATE } from '@molecule/app-ide-panel-logic'
import type { SkillInfo } from '@molecule/app-ide-panel-logic/panels'
import { buildSettingsList, type SettingsDisplayValues } from '@molecule/app-ide-panel-logic/panels'
import { HttpContext } from '@molecule/app-solid'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { TestsCard } from '../components/TestsCard.jsx'
import { HelpCard } from '../parts/HelpCard.jsx'
import { ScriptsCard } from '../parts/ScriptsCard.jsx'
import { SettingsCard } from '../parts/SettingsCard.jsx'
import { SkillsCard } from '../parts/SkillsCard.jsx'

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

const SKILLS: SkillInfo[] = [
  { path: '.agents/skills/styling.md', name: 'styling', description: 'How to style things.' },
]

/**
 * A typed {@link HttpResponse} wrapper for a resolved value.
 * @param data - The response body.
 * @returns The response.
 */
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
  const get = (async (url: string) => {
    if (url.includes('/scripts')) {
      return ok({
        scripts: [{ name: 'seed', description: 'Seed the database.', createdAt: '' }],
      })
    }
    if (url.includes('/files-list')) {
      return ok({ files: SKILLS.map((skill) => `.agents/skills/${skill.name}/SKILL.md`) })
    }
    if (url.includes('/files/')) {
      return ok({ content: '---\nname: styling\ndescription: How to style things.\n---\n' })
    }
    return ok({})
  }) as HttpClient['get']
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
const CARDS: { name: string; element: () => JSX.Element; actions: boolean }[] = [
  {
    name: 'Tests',
    element: () => (
      <TestsCard
        tests={TESTS}
        status="ready"
        run={{
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
        }}
        initialQuery=""
        canRun
        onRun={() => {}}
        onCancel={() => {}}
        onFix={() => {}}
        fixDisabledReason={null}
        isLight={false}
      />
    ),
    actions: true,
  },
  {
    // The SAME card mid-run, because its Stop and its per-row Skip exist only
    // while a run is live — a fixture that is always idle can never see them,
    // and an action nothing renders is an action nothing enforces.
    name: 'Tests (running)',
    element: () => (
      <TestsCard
        tests={TESTS}
        status="ready"
        run={{
          ...EMPTY_RUN_STATE,
          running: true,
          runId: 'r1',
          queued: ['my-app/app:e2e/home.spec.ts'],
          currentId: 'my-app/app:e2e/home.spec.ts',
          skipUnavailable: false,
        }}
        initialQuery=""
        canRun
        onRun={() => {}}
        onCancel={() => {}}
        onSkipCurrent={() => {}}
        onFix={() => {}}
        fixDisabledReason={null}
        isLight={false}
      />
    ),
    actions: true,
  },
  {
    name: 'Scripts',
    element: () => <ScriptsCard projectId="p" initialQuery="" isLight={false} />,
    actions: true,
  },
  {
    name: 'Skills',
    element: () => (
      <SkillsCard projectId="p" initialQuery="" onLoad={() => {}} isLight={false} startCreating />
    ),
    actions: false,
  },
  {
    name: 'Settings',
    element: () => (
      <SettingsCard
        settings={buildSettingsList({
          model: 'a',
          effort: 'b',
          maxLoops: '3',
          autoCommit: 'off',
          autoFix: 'on',
          sounds: 'on',
          timestamps: 'off',
        } as SettingsDisplayValues)}
        onRunCommand={() => {}}
        isLight={false}
      />
    ),
    actions: false,
  },
  { name: 'Help', element: () => <HelpCard isLight={false} />, actions: false },
]

/** The root this file last mounted, disposed before the next render. */
const mounted: { dispose?: () => void } = {}

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(() => {
  mounted.dispose?.()
  mounted.dispose = undefined
  document.body.innerHTML = ''
  setProvider(createSimpleI18nProvider())
})

/**
 * Mounts one card under the http context it reads.
 *
 * @param element - The card.
 * @returns The mounted container.
 */
function mountCard(element: () => JSX.Element): HTMLElement {
  mounted.dispose?.()
  document.body.innerHTML = ''
  const container = document.createElement('div')
  document.body.appendChild(container)
  mounted.dispose = render(
    () => <HttpContext.Provider value={buildHttpClient()}>{element()}</HttpContext.Provider>,
    container,
  )
  return container
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
    async (name, card) => {
      const container = mountCard(card.element)
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
    const first = CARDS[0]!
    const container = mountCard(first.element)
    const ghosts = [...container.querySelectorAll('button')].filter((el) =>
      rendersAs(el, GHOST_VARIANT()),
    )
    expect(ghosts.length).toBeGreaterThan(0)
    for (const ghost of ghosts) {
      expect(ghost.getAttribute('data-mol-id') ?? '').toMatch(/output-toggle|failure-toggle/)
    }
  })
})
