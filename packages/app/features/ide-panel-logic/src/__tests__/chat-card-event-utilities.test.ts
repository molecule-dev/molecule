/**
 * {@link cardEventToSystemCard} — the ONE `CardEvent` → {@link SystemCard}
 * construction every framework's chat panel renders. The tests drive each
 * reachable branch with the values React's panel passes today: a translate
 * function that interpolates the English default, the project's model catalog +
 * the viewer's region choices, the custom-card factory registry and the panel's
 * logger.
 *
 * @module
 */

import { describe, expect, it } from 'vitest'

import type { CardEvent } from '@molecule/app-ai-chat'
import type { AppModelDefinition } from '@molecule/app-ai-models'
import type { TranslateFunction } from '@molecule/app-i18n'

import type { CardEventToSystemCardDeps } from '../components/chat-card-event-utilities.js'
import {
  cardEventToSystemCard,
  cardSegmentsAround,
} from '../components/chat-card-event-utilities.js'
import type { ChatEventCardFactory } from '../customEventCards.js'

/** A complete catalog model, with the fields a card's region lookup reads. */
function model(overrides: Partial<AppModelDefinition>): AppModelDefinition {
  return {
    id: overrides.id ?? 'm',
    provider: 'anthropic',
    label: 'Model',
    description: 'desc',
    contextWindow: 100_000,
    maxOutputTokens: 8_000,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    cacheReadPricePerMTok: 0.3,
    cacheWritePricePerMTok: 3.75,
    knowledgeCutoff: '2025-01-01',
    ...overrides,
  }
}

/** Translator that interpolates the English default — what an unbuilt bond renders. */
const enT: TranslateFunction = (key, values, opts) =>
  (opts?.defaultValue ?? key).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
    String(values?.[k] ?? `{{${k}}}`),
  )

/** Marker translator that names the key it was called with: `@@<key>@@`. */
const keyT: TranslateFunction = (key) => `@@${key}@@`

/** A recording stand-in for the panel's logger. */
function recordingLogger(): CardEventToSystemCardDeps['logger'] & {
  calls: Array<[string, ...unknown[]]>
} {
  const calls: Array<[string, ...unknown[]]> = []
  return { calls, error: (message, ...args) => calls.push([message, ...args]) }
}

/** Build the deps bag, overriding only what a test needs. */
function deps(overrides: Partial<CardEventToSystemCardDeps> = {}): CardEventToSystemCardDeps {
  return {
    t: enT,
    models: [],
    modelRegions: {},
    getFactory: () => undefined,
    logger: recordingLogger(),
    ...overrides,
  }
}

const US_MODEL = model({ id: 'us-model', label: 'US Model' })
const CN_MODEL = model({ id: 'cn-model', provider: 'moonshot', label: 'CN Model', regions: ['cn'] })
const TWO_REGION_MODEL = model({ id: 'two-region', label: 'Two Region', regions: ['us', 'eu'] })
const BYO_MODEL = model({ id: 'byo', provider: 'custom', label: 'BYO' })

describe('cardEventToSystemCard — model', () => {
  it('names the model and appends the catalog default region', () => {
    const card = cardEventToSystemCard(
      { kind: 'model', model: 'us-model' },
      'id-1',
      42,
      deps({ models: [US_MODEL] }),
    )
    expect(card).toEqual({ id: 'id-1', text: 'Now using us-model (US)', timestamp: 42 })
  })

  it('prefers the recorded label over the model id', () => {
    const card = cardEventToSystemCard(
      { kind: 'model', model: 'us-model', label: 'Custom label' },
      'id-1',
      42,
      deps({ models: [US_MODEL] }),
    )
    expect(card?.text).toBe('Now using Custom label (US)')
  })

  it('falls back to the model id when the event carries no label and no catalog entry', () => {
    const card = cardEventToSystemCard({ kind: 'model', model: 'missing' }, 'id', 1, deps())
    expect(card).toEqual({ id: 'id', text: 'Now using missing', timestamp: 1 })
  })

  it('uses the viewer-region choice when the model offers it', () => {
    const card = cardEventToSystemCard(
      { kind: 'model', model: 'two-region' },
      'id',
      1,
      deps({ models: [TWO_REGION_MODEL], modelRegions: { 'two-region': 'eu' } }),
    )
    expect(card?.text).toBe('Now using two-region (EU)')
  })

  it('ignores a region choice the model does not offer', () => {
    const card = cardEventToSystemCard(
      { kind: 'model', model: 'cn-model' },
      'id',
      1,
      deps({ models: [CN_MODEL], modelRegions: { 'cn-model': 'us' } }),
    )
    expect(card?.text).toBe('Now using cn-model (CN)')
  })

  it('never surfaces a region for a bring-your-own model', () => {
    const card = cardEventToSystemCard(
      { kind: 'model', model: 'byo' },
      'id',
      1,
      deps({ models: [BYO_MODEL] }),
    )
    expect(card?.text).toBe('Now using byo')
  })

  it('attributes the change to a member when the server recorded one', () => {
    const card = cardEventToSystemCard(
      { kind: 'model', model: 'us-model', by: 'Ada' },
      'id',
      1,
      deps({ models: [US_MODEL], t: keyT }),
    )
    expect(card?.text).toBe('@@ide.chat.cardBy@@')
    const card2 = cardEventToSystemCard(
      { kind: 'model', model: 'us-model', by: 'Ada' },
      'id',
      1,
      deps({ models: [US_MODEL] }),
    )
    expect(card2?.text).toBe('Now using us-model (US) — Ada')
  })
})

describe('cardEventToSystemCard — mode', () => {
  it('renders the plan-mode announcement', () => {
    const card = cardEventToSystemCard({ kind: 'mode', mode: 'plan' }, 'id', 1, deps({ t: keyT }))
    expect(card).toEqual({ id: 'id', text: '@@ide.chat.phasePlanning@@', timestamp: 1 })
  })

  it('renders the plan→build handoff for execute mode', () => {
    const card = cardEventToSystemCard({ kind: 'mode', mode: 'execute' }, 'id', 1, deps({}))
    expect(card).toEqual({
      id: 'id',
      text: '🔨 Building your app',
      timestamp: 1,
    })
  })
})

describe('cardEventToSystemCard — setting', () => {
  const setting = (
    value: Extract<CardEvent, { kind: 'setting' }>,
    t: TranslateFunction = enT,
  ): unknown => cardEventToSystemCard(value, 'id', 1, deps({ t }))

  it('renders the per-mode effort with the model label', () => {
    expect(
      setting({ kind: 'setting', setting: 'effort', value: 'high', mode: 'plan', label: 'Opus' }),
    ).toEqual({
      id: 'id',
      text: 'Reasoning effort for plan set to high (Opus).',
      timestamp: 1,
    })
  })

  it('renders the per-mode effort without a model label', () => {
    expect(setting({ kind: 'setting', setting: 'effort', value: 'low' }, keyT)).toEqual({
      id: 'id',
      text: '@@ide.chat.setting.effort@@',
      timestamp: 1,
    })
  })

  it('defaults a missing effort value to `default`', () => {
    expect(setting({ kind: 'setting', setting: 'effort', mode: 'execute' })).toEqual({
      id: 'id',
      text: 'Reasoning effort for execute set to default.',
      timestamp: 1,
    })
  })

  it('renders fast mode on and off', () => {
    expect(setting({ kind: 'setting', setting: 'fastMode', value: true })).toEqual({
      id: 'id',
      text: 'Fast mode on — faster responses at a higher rate',
      timestamp: 1,
    })
    expect(setting({ kind: 'setting', setting: 'fastMode', value: false })).toEqual({
      id: 'id',
      text: 'Fast mode off',
      timestamp: 1,
    })
  })

  it('renders the max tool-loop count', () => {
    expect(setting({ kind: 'setting', setting: 'maxToolLoops', value: 7 })).toEqual({
      id: 'id',
      text: 'Max tool iterations set to 7',
      timestamp: 1,
    })
    expect(setting({ kind: 'setting', setting: 'maxToolLoops' })).toEqual({
      id: 'id',
      text: 'Max tool iterations set to 0',
      timestamp: 1,
    })
  })

  it('renders the processing region in upper case', () => {
    expect(setting({ kind: 'setting', setting: 'region', value: 'eu', label: 'Opus' })).toEqual({
      id: 'id',
      text: 'Now using Opus (EU)',
      timestamp: 1,
    })
    expect(setting({ kind: 'setting', setting: 'region' })).toEqual({
      id: 'id',
      text: 'Now using  ()',
      timestamp: 1,
    })
  })

  it('renders the auto-fix and auto-approve toggles', () => {
    expect(setting({ kind: 'setting', setting: 'autoFix', value: true })).toEqual({
      id: 'id',
      text: 'Auto-fix enabled.',
      timestamp: 1,
    })
    expect(setting({ kind: 'setting', setting: 'autoFix', value: false })).toEqual({
      id: 'id',
      text: 'Auto-fix disabled.',
      timestamp: 1,
    })
    expect(setting({ kind: 'setting', setting: 'autoApprove', value: true })).toEqual({
      id: 'id',
      text: 'Auto-approve on — destructive commands run without asking. The exfiltration guard still asks. Turn off with /autoapprove.',
      timestamp: 1,
    })
    expect(setting({ kind: 'setting', setting: 'autoApprove', value: false })).toEqual({
      id: 'id',
      text: 'Auto-approve off — destructive commands ask before running.',
      timestamp: 1,
    })
  })

  it('attributes the setting change to a member', () => {
    expect(setting({ kind: 'setting', setting: 'fastMode', value: true, by: 'Ada' })).toEqual({
      id: 'id',
      text: 'Fast mode on — faster responses at a higher rate — Ada',
      timestamp: 1,
    })
  })
})

describe('cardEventToSystemCard — skills', () => {
  it('renders the loaded-skills count with the skillsLoaded variant', () => {
    const card = cardEventToSystemCard({ kind: 'skills', count: 3 }, 'id', 1, deps({ t: keyT }))
    expect(card).toEqual({
      id: 'id',
      variant: 'skillsLoaded',
      text: '@@ide.chat.skills.loadedCount@@',
      timestamp: 1,
    })
  })
})

describe('cardEventToSystemCard — custom', () => {
  const factory = (): ChatEventCardFactory => (data) => ({
    text: `card:${String(data?.flag)}`,
  })

  it('drops the card when no factory is registered', () => {
    expect(cardEventToSystemCard({ kind: 'custom', name: 'x' }, 'id', 1, deps())).toBeNull()
  })

  it('drops the card when the factory returns null', () => {
    expect(
      cardEventToSystemCard(
        { kind: 'custom', name: 'x' },
        'id',
        1,
        deps({ getFactory: () => () => null }),
      ),
    ).toBeNull()
  })

  it('hands the event data to the factory and carries every card field through', () => {
    const action = { label: 'Go', href: '/go' }
    const content = ['before ', { label: 'link', href: '/l' }]
    const registered: ChatEventCardFactory = () => ({
      text: 'Built',
      action,
      emphasized: true,
      tone: 'gold',
      icon: 'lightbulb',
      content,
      coversLimitType: 'ai_cost',
      critical: true,
    })
    const seen: Array<Record<string, unknown> | undefined> = []
    const card = cardEventToSystemCard(
      { kind: 'custom', name: 'x', data: { flag: 1 } },
      'id',
      1,
      deps({
        getFactory: (name) => {
          expect(name).toBe('x')
          return (data) => {
            seen.push(data)
            return registered(data)
          }
        },
      }),
    )
    expect(seen).toEqual([{ flag: 1 }])
    expect(card).toEqual({
      id: 'id',
      text: 'Built',
      action,
      emphasized: true,
      tone: 'gold',
      icon: 'lightbulb',
      content,
      coversLimitType: 'ai_cost',
      critical: true,
      timestamp: 1,
    })
  })

  it('skips absent optional fields instead of writing undefined keys', () => {
    const card = cardEventToSystemCard(
      { kind: 'custom', name: 'x' },
      'id',
      1,
      deps({ getFactory: factory }),
    )
    expect(card).toEqual({ id: 'id', text: 'card:undefined', timestamp: 1 })
  })

  it('logs and drops the card when the factory throws', () => {
    const logger = recordingLogger()
    const error = new Error('boom')
    const card = cardEventToSystemCard(
      { kind: 'custom', name: 'bad', data: { flag: 1 } },
      'id',
      1,
      deps({
        getFactory: () => () => {
          throw error
        },
        logger,
      }),
    )
    expect(card).toBeNull()
    expect(logger.calls).toEqual([
      ['Custom chat card factory threw — dropping the card', { error, name: 'bad' }],
    ])
  })

  it('passes every key it can through the marker translator', () => {
    const calls: string[] = []
    const recordT: TranslateFunction = (key) => {
      calls.push(key)
      return `@@${key}@@`
    }
    cardEventToSystemCard(
      { kind: 'setting', setting: 'effort', value: 'high', mode: 'plan' },
      'id',
      1,
      deps({ t: recordT }),
    )
    expect(calls).toEqual(['ide.chat.setting.effort'])

    calls.length = 0
    cardEventToSystemCard({ kind: 'skills', count: 1 }, 'id', 1, deps({ t: recordT }))
    expect(calls).toEqual(['ide.chat.skills.loadedCount'])
  })
})

describe('cardSegmentsAround', () => {
  const name = { label: 'deploy', code: true as const }
  const render = (template: string) => (slot: string) => template.replace('{{name}}', slot)

  it('puts the segment where the sentence places its placeholder', () => {
    expect(cardSegmentsAround(render('Loaded {{name}} skill'), name)).toEqual([
      'Loaded ',
      name,
      ' skill',
    ])
  })

  it('follows a translation that moves the placeholder to the front, with no empty strings', () => {
    expect(cardSegmentsAround(render('{{name}} geladen'), name)).toEqual([name, ' geladen'])
  })

  it('returns null when the rendered sentence lacks the placeholder', () => {
    expect(cardSegmentsAround(() => 'Loaded the skill', name)).toBeNull()
  })
})
