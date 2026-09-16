// @vitest-environment jsdom

/**
 * Every command card's ACTIONS must look like buttons.
 *
 * The owner's words after driving `/test` in production: *"make all of the
 * buttons look like buttons too... be consistent... i thought we had this shit
 * in DESIGN.md and other places"*. The cause was a card rendering its actions
 * with `cm.button({ variant: 'ghost' })` — which resolves to a borderless,
 * transparent box, i.e. a text link. Its siblings had all used a filled or
 * bordered variant, and nothing enforced that, so the next card drifted.
 *
 * This is the enforcement (molecule DESIGN.md → Command cards). It renders each
 * command card with fixture data, finds every button that is an ACTION — by its
 * verb, or by a `data-mol-id` carrying `-run-`/`-fix-` — and asserts it carries
 * a real button variant and NOT the ghost one. `ghost` stays legal for
 * dismiss/disclosure controls (Cancel, Show output), which is what the sibling
 * cards already use it for.
 *
 * The variants are resolved FROM THE CLASSMAP BOND, never written here as
 * literal class names (molecule AGENTS.md rule 5), so a bond that restyles its
 * buttons keeps this test true.
 *
 * @module
 */

import { cleanup, render, waitFor } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { HttpClient } from '@molecule/app-http'
import { createSimpleI18nProvider, setProvider } from '@molecule/app-i18n'
import { setIconSet } from '@molecule/app-icons'
import { HttpProvider, I18nProvider } from '@molecule/app-react'
import { setClassMap } from '@molecule/app-ui'
import { classMap } from '@molecule/app-ui-tailwind'

import { buildSettingsList } from '../components/chat-settings-utilities.js'
import type { SkillInfo } from '../components/chat-skills-utilities.js'
import { HelpCard } from '../components/HelpCard.js'
import { ScriptsCard } from '../components/ScriptsCard.js'
import { SettingsCard } from '../components/SettingsCard.js'
import { SkillsCard } from '../components/SkillsCard.js'
import { EMPTY_RUN_STATE } from '../components/tests-card-utilities.js'
import { TestsCard } from '../components/TestsCard.js'
import type { TestItem } from '../types.js'

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

/** An http client that answers each card's own listing and rejects everything else. */
function buildHttpClient(): HttpClient {
  const reject = (): Promise<never> => Promise.reject(new Error('http disabled in test'))
  const get = (async (url: string) => {
    if (url.includes('/scripts')) {
      return {
        data: {
          scripts: [{ name: 'seed', description: 'Seed the database.', createdAt: '' }],
        },
      }
    }
    if (url.includes('/files-list') || url.includes('/skills')) return { data: { skills: SKILLS } }
    return { data: {} }
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
  } as unknown as HttpClient
}

/**
 * Wrap a card in the contexts it reads.
 *
 * @param children - The card.
 * @returns The wrapped tree.
 */
function wrap(children: ReactNode): ReactElement {
  return (
    <I18nProvider provider={createSimpleI18nProvider('en')}>
      <HttpProvider client={buildHttpClient()}>{children}</HttpProvider>
    </I18nProvider>
  )
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
const CARDS: { name: string; element: () => ReactElement; actions: boolean }[] = [
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
        } as Parameters<typeof buildSettingsList>[0])}
        onRunCommand={() => {}}
        isLight={false}
      />
    ),
    actions: false,
  },
  { name: 'Help', element: () => <HelpCard isLight={false} />, actions: false },
]

beforeEach(() => {
  setClassMap(classMap)
  setProvider(createSimpleI18nProvider('en'))
  setIconSet(new Proxy({}, { get: () => ({ paths: [] }) }))
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

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
      const { container } = render(wrap(card.element()))
      // Scripts and Skills list asynchronously; their Run/Create buttons only
      // exist once the listing resolves.
      if (card.actions) {
        await waitFor(() => {
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
    const { container } = render(wrap((CARDS[0] as (typeof CARDS)[number]).element()))
    const ghosts = [...container.querySelectorAll('button')].filter((el) =>
      rendersAs(el, GHOST_VARIANT()),
    )
    expect(ghosts.length).toBeGreaterThan(0)
    for (const ghost of ghosts) {
      expect(ghost.getAttribute('data-mol-id') ?? '').toMatch(/output-toggle|failure-toggle/)
    }
  })
})
