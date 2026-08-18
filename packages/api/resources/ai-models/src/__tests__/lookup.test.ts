import { describe, expect, it } from 'vitest'

import {
  effectiveBaseRates,
  effectivePeakPricing,
  getAvailableModels,
  getModel,
  getModelsByProvider,
  isSelectableModel,
  MODEL_IDS,
  modelRegionRates,
  priceMultiplierAt,
  resolveSelectableModelId,
  withEffectivePricing,
} from '../lookup.js'
import { MODELS } from '../models.js'

// ---------------------------------------------------------------------------
// webSearchToolType on model definitions
// ---------------------------------------------------------------------------

describe('webSearchToolType', () => {
  const modelsWithWebSearch = MODELS.filter((m) => m.webSearchToolType)
  const modelsWithoutWebSearch = MODELS.filter((m) => !m.webSearchToolType)

  it('is set on all Anthropic models', () => {
    const anthropic = MODELS.filter((m) => m.provider === 'anthropic')
    expect(anthropic.length).toBeGreaterThan(0)
    for (const m of anthropic) {
      expect(m.webSearchToolType).toBeDefined()
    }
    expect(MODELS.find((m) => m.id === 'claude-opus-4-6')!.webSearchToolType).toBe(
      'web_search_20260209',
    )
    expect(MODELS.find((m) => m.id === 'claude-sonnet-4-6')!.webSearchToolType).toBe(
      'web_search_20260209',
    )
    expect(MODELS.find((m) => m.id === 'claude-haiku-4-5-20251001')!.webSearchToolType).toBe(
      'web_search_20250305',
    )
  })

  it('is set on OpenAI, Google, and Zhipu models', () => {
    for (const provider of ['openai', 'zhipu'] as const) {
      const models = MODELS.filter((m) => m.provider === provider)
      expect(models.length).toBeGreaterThan(0)
      for (const m of models) {
        expect(m.webSearchToolType).toBe('web_search')
      }
    }
    const google = MODELS.filter((m) => m.provider === 'google')
    for (const m of google) {
      expect(m.webSearchToolType).toBe('google_search')
    }
  })

  it('every model with webSearchToolType has a non-empty string', () => {
    for (const m of modelsWithWebSearch) {
      expect(typeof m.webSearchToolType).toBe('string')
      expect(m.webSearchToolType!.length).toBeGreaterThan(0)
    }
  })

  it('models without webSearchToolType have it undefined', () => {
    for (const m of modelsWithoutWebSearch) {
      expect(m.webSearchToolType).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// codeExecutionToolType on model definitions
// ---------------------------------------------------------------------------

describe('codeExecutionToolType', () => {
  it('is set on Anthropic Opus and Sonnet (not Haiku)', () => {
    expect(MODELS.find((m) => m.id === 'claude-opus-4-6')!.codeExecutionToolType).toBe(
      'code_execution_20250825',
    )
    expect(MODELS.find((m) => m.id === 'claude-sonnet-4-6')!.codeExecutionToolType).toBe(
      'code_execution_20250825',
    )
    expect(
      MODELS.find((m) => m.id === 'claude-haiku-4-5-20251001')!.codeExecutionToolType,
    ).toBeUndefined()
  })

  it('is set on OpenAI models as code_interpreter', () => {
    for (const provider of ['openai'] as const) {
      const models = MODELS.filter((m) => m.provider === provider)
      expect(models.length).toBeGreaterThan(0)
      for (const m of models) {
        expect(m.codeExecutionToolType).toBe('code_interpreter')
      }
    }
  })

  it('is set on Google as code_execution', () => {
    const google = MODELS.filter((m) => m.provider === 'google')
    for (const m of google) {
      expect(m.codeExecutionToolType).toBe('code_execution')
    }
  })

  it('is not set on Meta, Moonshot, MiniMax, Alibaba, or Zhipu models', () => {
    for (const provider of ['meta', 'moonshot', 'minimax', 'alibaba', 'zhipu'] as const) {
      const models = MODELS.filter((m) => m.provider === provider)
      for (const m of models) {
        expect(m.codeExecutionToolType).toBeUndefined()
      }
    }
  })
})

// ---------------------------------------------------------------------------
// webFetchToolType on model definitions
// ---------------------------------------------------------------------------

describe('webFetchToolType', () => {
  it('is set on Anthropic Opus, Sonnet, and Haiku', () => {
    expect(MODELS.find((m) => m.id === 'claude-opus-4-6')!.webFetchToolType).toBe(
      'web_fetch_20260209',
    )
    expect(MODELS.find((m) => m.id === 'claude-sonnet-4-6')!.webFetchToolType).toBe(
      'web_fetch_20260209',
    )
    expect(MODELS.find((m) => m.id === 'claude-haiku-4-5-20251001')!.webFetchToolType).toBe(
      'web_fetch_20250910',
    )
  })

  it('is set on Google as url_context', () => {
    const google = MODELS.filter((m) => m.provider === 'google')
    for (const m of google) {
      expect(m.webFetchToolType).toBe('url_context')
    }
  })

  it('is not set on OpenAI, xAI, Meta, Moonshot, MiniMax, Alibaba, or Zhipu models', () => {
    for (const provider of [
      'openai',
      'xai',
      'meta',
      'moonshot',
      'minimax',
      'alibaba',
      'zhipu',
    ] as const) {
      const models = MODELS.filter((m) => m.provider === provider)
      for (const m of models) {
        expect(m.webFetchToolType).toBeUndefined()
      }
    }
  })
})

// ---------------------------------------------------------------------------
// getModel lookup
// ---------------------------------------------------------------------------

describe('getModel', () => {
  it('returns model definition for valid ID', () => {
    const model = getModel('claude-haiku-4-5-20251001')
    expect(model).toBeDefined()
    expect(model!.provider).toBe('anthropic')
    expect(model!.webSearchToolType).toBe('web_search_20250305')
  })

  it('returns undefined for unknown ID', () => {
    expect(getModel('nonexistent-model')).toBeUndefined()
  })

  it('still returns a disabled model so historical usage stays priceable', () => {
    // grok-code-fast-1 is retired (disabled) but MUST remain priceable: a saved
    // selection or a past usage row can still reference it. NEVER delete it.
    const grokCode = getModel('grok-code-fast-1')
    expect(grokCode).toBeDefined()
    expect(grokCode!.disabled).toBe(true)
    expect(grokCode!.inputPricePerMTok).toBeGreaterThan(0)
    expect(grokCode!.outputPricePerMTok).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// MODEL_IDS set
// ---------------------------------------------------------------------------

describe('MODEL_IDS', () => {
  it('contains every selectable model ID, and excludes disabled + superseded ones', () => {
    for (const model of MODELS) {
      expect(MODEL_IDS.has(model.id), model.id).toBe(isSelectableModel(model))
    }
  })

  it('has one entry per selectable model', () => {
    expect(MODEL_IDS.size).toBe(MODELS.filter(isSelectableModel).length)
  })

  it('returns false for unknown IDs', () => {
    expect(MODEL_IDS.has('nonexistent-model')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Pricing integrity — spend-accounting invariant
//
// Every offered model MUST carry finite, non-negative per-MTok prices. The cost
// accumulator (molecule-dev ai-cost.ts `computeAiCostCents`) prices each turn from
// these and returns 0 for any model it can't price — so an offered-but-unpriced
// model would silently fall through as FREE and under-count real spend. Since
// chat dispatch is clamped to MODEL_IDS, "every MODELS entry is priced" is exactly
// the guarantee that no usable model escapes metering.
// ---------------------------------------------------------------------------

describe('pricing integrity (spend accounting)', () => {
  it('every model has finite, non-negative input + output per-MTok prices', () => {
    for (const model of MODELS) {
      expect(
        Number.isFinite(model.inputPricePerMTok),
        `${model.id} inputPricePerMTok must be a finite number`,
      ).toBe(true)
      expect(
        Number.isFinite(model.outputPricePerMTok),
        `${model.id} outputPricePerMTok must be a finite number`,
      ).toBe(true)
      expect(
        model.inputPricePerMTok,
        `${model.id} inputPricePerMTok must be >= 0`,
      ).toBeGreaterThanOrEqual(0)
      expect(
        model.outputPricePerMTok,
        `${model.id} outputPricePerMTok must be >= 0`,
      ).toBeGreaterThanOrEqual(0)
    }
  })

  it('every model has finite, non-negative cache read + write per-MTok prices', () => {
    // With prompt caching on, cache-read tokens are the DOMINANT input category
    // for the agentic loop. A model that shipped without cache prices (or with
    // them left at 0) would bill the bulk of real spend as FREE — the exact
    // under-counting CST1 fixed. Requiring finite, non-negative cache prices on
    // every offered model is the compile-and-test guard against that regression.
    for (const model of MODELS) {
      expect(
        Number.isFinite(model.cacheReadPricePerMTok),
        `${model.id} cacheReadPricePerMTok must be a finite number`,
      ).toBe(true)
      expect(
        Number.isFinite(model.cacheWritePricePerMTok),
        `${model.id} cacheWritePricePerMTok must be a finite number`,
      ).toBe(true)
      expect(
        model.cacheReadPricePerMTok,
        `${model.id} cacheReadPricePerMTok must be >= 0`,
      ).toBeGreaterThanOrEqual(0)
      expect(
        model.cacheWritePricePerMTok,
        `${model.id} cacheWritePricePerMTok must be >= 0`,
      ).toBeGreaterThanOrEqual(0)
    }
  })

  it('cache reads are never costlier than fresh input; cache writes never cheaper', () => {
    // Sanity bounds that catch a swapped read/write or a misplaced decimal: a
    // cache HIT is always a discount on fresh input, and a cache WRITE never
    // costs less than fresh input (it may carry a premium, e.g. Anthropic 1.25×).
    for (const model of MODELS) {
      expect(
        model.cacheReadPricePerMTok,
        `${model.id} cache read must be <= input price`,
      ).toBeLessThanOrEqual(model.inputPricePerMTok)
      expect(
        model.cacheWritePricePerMTok,
        `${model.id} cache write must be >= input price`,
      ).toBeGreaterThanOrEqual(model.inputPricePerMTok)
    }
  })

  it('scheduledPricing (when declared) is a dated, well-formed future rate card', () => {
    // A staged price change bills real money the instant it lands, with nobody
    // reviewing it at that moment — so the same bounds the base rates get, plus
    // a parseable instant (an unparseable one is silently ignored by
    // effectiveBaseRates, which would leave a landed change un-billed).
    for (const model of MODELS) {
      const s = model.scheduledPricing
      if (!s) continue
      expect(
        Number.isNaN(Date.parse(s.effectiveFrom)),
        `${model.id} scheduledPricing.effectiveFrom must be a parseable instant`,
      ).toBe(false)
      for (const field of [
        'inputPricePerMTok',
        'outputPricePerMTok',
        'cacheReadPricePerMTok',
        'cacheWritePricePerMTok',
      ] as const) {
        expect(
          Number.isFinite(s[field]),
          `${model.id} scheduledPricing.${field} must be finite`,
        ).toBe(true)
        expect(
          s[field],
          `${model.id} scheduledPricing.${field} must be >= 0`,
        ).toBeGreaterThanOrEqual(0)
      }
      expect(
        s.cacheReadPricePerMTok,
        `${model.id} scheduled cache read must be <= scheduled input price`,
      ).toBeLessThanOrEqual(s.inputPricePerMTok)
      expect(
        s.cacheWritePricePerMTok,
        `${model.id} scheduled cache write must be >= scheduled input price`,
      ).toBeGreaterThanOrEqual(s.inputPricePerMTok)
      if (s.peakPricing) {
        expect(
          s.peakPricing.multiplier,
          `${model.id} scheduled peak multiplier must be >= 1`,
        ).toBeGreaterThanOrEqual(1)
        for (const w of s.peakPricing.windows) {
          for (const [name, value] of Object.entries(w)) {
            expect(
              Number.isInteger(value) && value >= 0 && value <= 1440,
              `${model.id} scheduled peak window ${name} must be a minute-of-day`,
            ).toBe(true)
          }
        }
      }
    }
  })

  it('fastPricing (when declared) is finite, premium-or-equal, and internally consistent', () => {
    // Fast mode bills at a PREMIUM (Anthropic fast is 2× standard) — a
    // fastPricing block cheaper than base rates, or with swapped cache fields,
    // would under-meter every fast-served turn.
    for (const model of MODELS) {
      if (!model.fastPricing) continue
      const fp = model.fastPricing
      for (const [field, value] of Object.entries(fp)) {
        expect(Number.isFinite(value), `${model.id} fastPricing.${field} must be finite`).toBe(true)
        expect(value, `${model.id} fastPricing.${field} must be >= 0`).toBeGreaterThanOrEqual(0)
      }
      expect(
        fp.inputPricePerMTok,
        `${model.id} fast input must be >= standard input`,
      ).toBeGreaterThanOrEqual(model.inputPricePerMTok)
      expect(
        fp.outputPricePerMTok,
        `${model.id} fast output must be >= standard output`,
      ).toBeGreaterThanOrEqual(model.outputPricePerMTok)
      expect(
        fp.cacheReadPricePerMTok,
        `${model.id} fast cache read must be <= fast input price`,
      ).toBeLessThanOrEqual(fp.inputPricePerMTok)
      expect(
        fp.cacheWritePricePerMTok,
        `${model.id} fast cache write must be >= fast input price`,
      ).toBeGreaterThanOrEqual(fp.inputPricePerMTok)
    }
  })

  it('every model has a non-empty id and label', () => {
    for (const model of MODELS) {
      expect(typeof model.id === 'string' && model.id.length > 0).toBe(true)
      expect(typeof model.label === 'string' && model.label.length > 0).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// getModelsByProvider
// ---------------------------------------------------------------------------

describe('getModelsByProvider', () => {
  it('returns Anthropic models', () => {
    const models = getModelsByProvider('anthropic')
    expect(models.length).toBeGreaterThan(0)
    for (const m of models) {
      expect(m.provider).toBe('anthropic')
    }
  })

  it('returns models for each provider that has entries', () => {
    const providers = [...new Set(MODELS.map((m) => m.provider))]
    for (const provider of providers) {
      const models = getModelsByProvider(provider)
      expect(models.length).toBeGreaterThan(0)
      for (const m of models) {
        expect(m.provider).toBe(provider)
      }
    }
  })

  it('returns all models for a provider (not a subset)', () => {
    const providers = [...new Set(MODELS.map((m) => m.provider))]
    for (const provider of providers) {
      const expected = MODELS.filter((m) => m.provider === provider).length
      expect(getModelsByProvider(provider).length).toBe(expected)
    }
  })
})

// ---------------------------------------------------------------------------
// getAvailableModels
// ---------------------------------------------------------------------------

describe('getAvailableModels', () => {
  it('returns models only from available providers (Set)', () => {
    const available = new Set<(typeof MODELS)[number]['provider']>(['anthropic'])
    const models = getAvailableModels(available)
    expect(models.length).toBeGreaterThan(0)
    for (const m of models) {
      expect(m.provider).toBe('anthropic')
    }
  })

  it('accepts an array of providers', () => {
    const models = getAvailableModels(['anthropic', 'openai'])
    expect(models.length).toBeGreaterThan(0)
    for (const m of models) {
      expect(['anthropic', 'openai']).toContain(m.provider)
    }
  })

  it('returns empty for empty provider set', () => {
    expect(getAvailableModels(new Set())).toEqual([])
  })

  it('returns all selectable models when all providers are available', () => {
    const allProviders = new Set(MODELS.map((m) => m.provider))
    expect(getAvailableModels(allProviders).length).toBe(MODELS.filter(isSelectableModel).length)
  })

  it('excludes disabled models even when their provider is available', () => {
    const xaiModels = getAvailableModels(['xai'])
    expect(xaiModels.length).toBeGreaterThan(0)
    for (const m of xaiModels) {
      expect(m.disabled, m.id).not.toBe(true)
    }
    expect(xaiModels.some((m) => m.id === 'grok-code-fast-1')).toBe(false)
  })

  it('excludes superseded models even when their provider is available', () => {
    // The picker offers ONE generation per family: an older generation that is
    // still served upstream (grok-4.3 next to grok-4.5) must not be listed.
    const xaiModels = getAvailableModels(['xai'])
    expect(xaiModels.some((m) => m.id === 'grok-4.3')).toBe(false)
    expect(xaiModels.some((m) => m.id === 'grok-4.5')).toBe(true)
    for (const m of getAvailableModels(new Set(MODELS.map((x) => x.provider)))) {
      expect(m.supersededBy, m.id).toBeUndefined()
    }
  })
})

// ---------------------------------------------------------------------------
// Model data integrity
// ---------------------------------------------------------------------------

describe('model data integrity', () => {
  it('has exactly one freeTier model', () => {
    const freeTierModels = MODELS.filter((m) => m.freeTier)
    expect(freeTierModels).toHaveLength(1)
    expect(freeTierModels[0].id).toBe('deepseek-v4-flash')
  })

  it('the freeTier model is not disabled', () => {
    // A disabled free-tier model would leave the IDE with no usable default.
    const free = MODELS.find((m) => m.freeTier)
    expect(free).toBeDefined()
    expect(free!.disabled).not.toBe(true)
  })

  it('sets thinkingConfigurable on all models with supportsThinking', () => {
    for (const model of MODELS) {
      if (model.supportsThinking) {
        expect(typeof model.thinkingConfigurable).toBe('boolean')
      }
    }
  })

  it('has positive pricing on every model', () => {
    for (const model of MODELS) {
      expect(model.inputPricePerMTok).toBeGreaterThan(0)
      expect(model.outputPricePerMTok).toBeGreaterThan(0)
    }
  })
})

describe('scheduledPricing (announced, dated price changes)', () => {
  const BEFORE = new Date('2026-08-16T15:59:59Z')
  const AT = new Date('2026-08-16T16:00:00Z')
  const AFTER = new Date('2026-08-17T12:00:00Z')

  const staged = {
    ...MODELS.find((m) => m.id === 'claude-sonnet-5')!,
    inputPricePerMTok: 1,
    outputPricePerMTok: 2,
    cacheReadPricePerMTok: 0.1,
    cacheWritePricePerMTok: 1,
    regionPricing: { us: { inputPricePerMTok: 9, outputPricePerMTok: 9 } },
    regions: ['cn', 'us'],
    scheduledPricing: {
      effectiveFrom: '2026-08-16T16:00:00Z',
      inputPricePerMTok: 3,
      outputPricePerMTok: 6,
      cacheReadPricePerMTok: 0.3,
      cacheWritePricePerMTok: 3,
      peakPricing: { windows: [{ startMinuteUtc: 60, endMinuteUtc: 240 }], multiplier: 2 },
    },
  }

  it('bills the base rates until the instant, the staged rates from it', () => {
    expect(effectiveBaseRates(staged, BEFORE).inputPricePerMTok).toBe(1)
    // Half-open at the instant itself: the change IS in force at effectiveFrom.
    expect(effectiveBaseRates(staged, AT).inputPricePerMTok).toBe(3)
    expect(effectiveBaseRates(staged, AFTER)).toEqual({
      inputPricePerMTok: 3,
      outputPricePerMTok: 6,
      cacheReadPricePerMTok: 0.3,
      cacheWritePricePerMTok: 3,
    })
  })

  it('leaves regionPricing alone — a re-host does not reprice because the native provider did', () => {
    // The US entry is another host's rate card; only the base (native) rates
    // are scheduled. Pricing the re-host off the native change would invent a
    // number no provider published.
    expect(modelRegionRates(staged, 'us', BEFORE).inputPricePerMTok).toBe(9)
    expect(modelRegionRates(staged, 'us', AFTER).inputPricePerMTok).toBe(9)
    expect(modelRegionRates(staged, 'cn', BEFORE).inputPricePerMTok).toBe(1)
    expect(modelRegionRates(staged, 'cn', AFTER).inputPricePerMTok).toBe(3)
  })

  it('defaults to NOW so a caller cannot keep billing a superseded rate by omitting the instant', () => {
    const past = {
      ...staged,
      scheduledPricing: { ...staged.scheduledPricing, effectiveFrom: '2020-01-01T00:00:00Z' },
    }
    expect(modelRegionRates(past, 'cn').inputPricePerMTok).toBe(3)
    expect(effectiveBaseRates(past).inputPricePerMTok).toBe(3)
  })

  it('ignores an unparseable effectiveFrom rather than repricing on it', () => {
    // Failing OPEN here would silently move real money on a typo; the verified
    // current rates stay in force and the invariant test catches the typo.
    const broken = {
      ...staged,
      scheduledPricing: { ...staged.scheduledPricing, effectiveFrom: 'not-a-date' },
    }
    expect(effectiveBaseRates(broken, AFTER).inputPricePerMTok).toBe(1)
    expect(effectivePeakPricing(broken, AFTER)).toBeUndefined()
  })

  it('carries existing peak windows through when the staged entry omits them', () => {
    const existing = { windows: [{ startMinuteUtc: 0, endMinuteUtc: 60 }], multiplier: 3 }
    const noPeak = {
      ...staged,
      peakPricing: existing,
      scheduledPricing: { ...staged.scheduledPricing, peakPricing: undefined },
    }
    expect(effectivePeakPricing(noPeak, BEFORE)).toBe(existing)
    expect(effectivePeakPricing(noPeak, AFTER)).toBe(existing)
  })

  it('can schedule the END of peak pricing with an explicit empty window list', () => {
    const ending = {
      ...staged,
      peakPricing: { windows: [{ startMinuteUtc: 0, endMinuteUtc: 1440 }], multiplier: 2 },
      scheduledPricing: { ...staged.scheduledPricing, peakPricing: { windows: [], multiplier: 1 } },
    }
    expect(priceMultiplierAt(ending, BEFORE)).toBe(2)
    expect(priceMultiplierAt(ending, AFTER)).toBe(1)
  })

  it('withEffectivePricing folds the effective rates in and strips the schedule', () => {
    const before = withEffectivePricing(staged, BEFORE)
    expect(before.inputPricePerMTok).toBe(1)
    expect(before.peakPricing).toBeUndefined()
    expect(before.scheduledPricing).toBeUndefined()

    const after = withEffectivePricing(staged, AFTER)
    expect(after.inputPricePerMTok).toBe(3)
    expect(after.cacheReadPricePerMTok).toBe(0.3)
    expect(after.peakPricing).toEqual(staged.scheduledPricing.peakPricing)
    expect(after.scheduledPricing).toBeUndefined()
    // Everything else survives the projection untouched.
    expect(after.id).toBe(staged.id)
    expect(after.regionPricing).toEqual(staged.regionPricing)
  })

  it('returns models without a schedule unchanged', () => {
    const plain = MODELS.find((m) => m.id === 'claude-sonnet-5')!
    expect(withEffectivePricing(plain, AFTER)).toBe(plain)
  })
})

describe('DeepSeek 2026-08-16 price rise (landed)', () => {
  // The concrete case the scheduling mechanism was built for. It landed on
  // 2026-08-16T16:00Z and the rates are now folded into the base fields;
  // re-verified against https://api-docs.deepseek.com/quick_start/pricing/ on
  // 2026-08-18. Peak is exactly 2× off-peak, which is why it maps onto a
  // multiplier rather than a second rate card.
  const AFTER_OFFPEAK = new Date('2026-08-17T12:00:00Z')
  const AFTER_PEAK = new Date('2026-08-17T02:00:00Z')

  it.each([
    ['deepseek-v4-pro', 0.66, 1.98, 0.022],
    ['deepseek-v4-flash', 0.22, 0.66, 0.007],
  ])('%s bills the landed CN rates', (id, input, output, cacheRead) => {
    const model = MODELS.find((m) => m.id === id)!
    // Folded in — a staged entry left behind after its instant would keep the
    // freshness gate warning and hide the next real change behind it.
    expect(model.scheduledPricing).toBeUndefined()

    const rates = modelRegionRates(model, 'cn', AFTER_OFFPEAK)
    expect(rates.inputPricePerMTok).toBe(input)
    expect(rates.outputPricePerMTok).toBe(output)
    expect(rates.cacheReadPricePerMTok).toBe(cacheRead)
    // DeepSeek charges no cache-write premium — write bills at input.
    expect(rates.cacheWritePricePerMTok).toBe(input)

    // Peak is a multiplier on the off-peak rates, not a second rate card.
    expect(priceMultiplierAt(model, AFTER_OFFPEAK, 'cn')).toBe(1)
    expect(priceMultiplierAt(model, AFTER_PEAK, 'cn')).toBe(2)
  })

  it('does not touch the US re-host rates', () => {
    // DeepInfra sets its own prices; the CN rise must not have moved them.
    // Asserted against the host's own card rather than "unchanged over time",
    // which is vacuous now that the rise is folded into the base fields.
    const us = {
      'deepseek-v4-pro': { input: 1.3, output: 2.6, cacheRead: 0.1 },
      'deepseek-v4-flash': { input: 0.08, output: 0.18, cacheRead: 0.016 },
    } as const
    for (const [id, expected] of Object.entries(us)) {
      const model = MODELS.find((m) => m.id === id)!
      const rates = modelRegionRates(model, 'us', AFTER_OFFPEAK)
      expect(rates.inputPricePerMTok, id).toBe(expected.input)
      expect(rates.outputPricePerMTok, id).toBe(expected.output)
      expect(rates.cacheReadPricePerMTok, id).toBe(expected.cacheRead)
      // ...and they are a different card from the native one, not a copy of it.
      expect(rates.inputPricePerMTok, id).not.toBe(model.inputPricePerMTok)
    }
  })

  it('does not apply the CN peak surcharge to the US re-host', () => {
    // DeepInfra has no peak pricing. Charging DeepSeek's Beijing-hours 2× on
    // top of its flat card would over-bill every US turn in those windows.
    for (const id of ['deepseek-v4-pro', 'deepseek-v4-flash']) {
      const model = MODELS.find((m) => m.id === id)!
      expect(priceMultiplierAt(model, AFTER_PEAK, 'us')).toBe(1)
      expect(priceMultiplierAt(model, AFTER_PEAK, 'cn')).toBe(2)
      // Region omitted → the model's OWN default, so the answer differs per
      // model: Pro defaults to native CN and takes the surcharge, Flash
      // defaults to the US re-host and never does.
      const expected = model.regions![0] === 'cn' ? 2 : 1
      expect(priceMultiplierAt(model, AFTER_PEAK)).toBe(expected)
    }
  })
})

describe('priceMultiplierAt (peak-hour pricing)', () => {
  const peakModel = {
    // Stripped to a bare native model: this block tests the peak-window
    // arithmetic in isolation, so it must not depend on where a staged price
    // change sits relative to these fixture dates, nor on which region the
    // catalog currently defaults to (a default region with a regionPricing
    // override prices off that host's card and never takes a native surcharge).
    ...(({ scheduledPricing: _s, regionPricing: _r, regions: _g, ...rest }) => rest)(
      MODELS.find((m) => m.id === 'deepseek-v4-flash')!,
    ),
    peakPricing: {
      windows: [
        { startMinuteUtc: 60, endMinuteUtc: 240 }, // 01:00–04:00 UTC
        { startMinuteUtc: 360, endMinuteUtc: 600 }, // 06:00–10:00 UTC
      ],
      multiplier: 2,
    },
  }

  it('returns the multiplier inside a peak window and 1 outside', () => {
    expect(priceMultiplierAt(peakModel, new Date('2026-07-20T00:30:00Z'))).toBe(1)
    expect(priceMultiplierAt(peakModel, new Date('2026-07-20T01:00:00Z'))).toBe(2)
    expect(priceMultiplierAt(peakModel, new Date('2026-07-20T03:59:00Z'))).toBe(2)
    // Half-open: the end minute itself is off-peak.
    expect(priceMultiplierAt(peakModel, new Date('2026-07-20T04:00:00Z'))).toBe(1)
    expect(priceMultiplierAt(peakModel, new Date('2026-07-20T07:00:00Z'))).toBe(2)
    expect(priceMultiplierAt(peakModel, new Date('2026-07-20T10:00:00Z'))).toBe(1)
  })

  it('supports windows that wrap midnight', () => {
    const wrap = {
      ...peakModel,
      peakPricing: { windows: [{ startMinuteUtc: 1380, endMinuteUtc: 120 }], multiplier: 1.5 }, // 23:00–02:00
    }
    expect(priceMultiplierAt(wrap, new Date('2026-07-20T23:30:00Z'))).toBe(1.5)
    expect(priceMultiplierAt(wrap, new Date('2026-07-20T01:00:00Z'))).toBe(1.5)
    expect(priceMultiplierAt(wrap, new Date('2026-07-20T02:00:00Z'))).toBe(1)
    expect(priceMultiplierAt(wrap, new Date('2026-07-20T12:00:00Z'))).toBe(1)
  })

  it('returns 1 for models without peak pricing and for unknown models', () => {
    const flat = MODELS.find((m) => m.id === 'claude-sonnet-5')!
    expect(priceMultiplierAt(flat, new Date('2026-07-20T02:00:00Z'))).toBe(1)
    expect(priceMultiplierAt(undefined, new Date('2026-07-20T02:00:00Z'))).toBe(1)
  })

  it('honors peak windows a scheduled change introduces, only from its instant', () => {
    // A model that is flat today and gains peak windows at the staged instant,
    // with no edit landed at the switch. (DeepSeek's 2026-08-16 rise was the
    // real case; it has since landed and is folded into the catalog, so the
    // mechanism is exercised on a fixture rather than a live entry.)
    const flat = MODELS.find((m) => m.id === 'claude-sonnet-5')!
    const gaining = {
      ...flat,
      peakPricing: undefined,
      scheduledPricing: {
        effectiveFrom: '2026-08-16T16:00:00Z',
        inputPricePerMTok: 1,
        outputPricePerMTok: 2,
        cacheReadPricePerMTok: 0.1,
        cacheWritePricePerMTok: 1,
        peakPricing: {
          windows: [{ startMinuteUtc: 60, endMinuteUtc: 240 }],
          multiplier: 2,
        },
      },
    }
    // 02:00 UTC is inside the staged 01:00–04:00 window on both dates.
    expect(priceMultiplierAt(gaining, new Date('2026-08-16T02:00:00Z'))).toBe(1)
    expect(priceMultiplierAt(gaining, new Date('2026-08-17T02:00:00Z'))).toBe(2)
    // Off-peak after the switch is still flat.
    expect(priceMultiplierAt(gaining, new Date('2026-08-17T12:00:00Z'))).toBe(1)
  })

  it('the DeepSeek catalog entries carry the rate card’s live peak windows', () => {
    // Live on the provider's own card since 2026-08-16T16:00Z and verified
    // there again 2026-08-18: "Peak hours are 01:00 - 04:00 and 06:00 - 10:00
    // UTC (all other hours are off-peak)", peak billing exactly 2× off-peak,
    // with no day-of-week qualifier. These windows must never be pre-wired
    // ahead of the card again — that over-billed every peak-window turn on the
    // free-tier default model for weeks.
    for (const id of ['deepseek-v4-pro', 'deepseek-v4-flash']) {
      const model = MODELS.find((m) => m.id === id)!
      expect(model.peakPricing, id).toEqual({
        windows: [
          { startMinuteUtc: 60, endMinuteUtc: 240 },
          { startMinuteUtc: 360, endMinuteUtc: 600 },
        ],
        multiplier: 2,
      })
      // The surcharge is the NATIVE host's — the US re-host card is flat.
      expect(priceMultiplierAt(model, new Date('2026-08-17T02:00:00Z'), 'cn'), id).toBe(2)
      expect(priceMultiplierAt(model, new Date('2026-08-17T12:00:00Z'), 'cn'), id).toBe(1)
      expect(priceMultiplierAt(model, new Date('2026-08-17T02:00:00Z'), 'us'), id).toBe(1)
    }
  })
})

// ---------------------------------------------------------------------------
// Model families — one generation per family is selectable
// ---------------------------------------------------------------------------

/**
 * A model's FAMILY: its provider plus the alphabetic id prefix before the first
 * version number, with the version parsed segment-wise (`qwen3.8-max` →
 * `alibaba|qwen` @ [3, 8]). Same rule as the workspace freshness gate
 * (`scripts/check-model-freshness.mjs`), so "we never care about the older
 * generation" means the same thing in the catalog and in the drift report.
 */
const parseFamily = (provider: string, id: string): { key: string; version: number[] } | null => {
  const match = /^(.*?)(\d+(?:\.\d+)*)/.exec(id.toLowerCase())
  if (!match) return null
  return { key: `${provider}|${match[1]}`, version: match[2].split('.').map(Number) }
}

const cmpVersion = (a: number[], b: number[]): number => {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const d = (a[i] ?? -1) - (b[i] ?? -1)
    if (d) return d
  }
  return 0
}

/**
 * Selectable pairs that SHARE a family key at different versions on purpose,
 * because the older id is a different TIER with no newer equivalent — hiding it
 * would leave the provider without that tier. Each entry is a deliberate,
 * reviewed exception; anything else must carry `supersededBy`.
 */
const INTENTIONAL_FAMILY_OVERLAPS: { older: string; newer: string; why: string }[] = [
  {
    older: 'gemini-3.1-pro-preview',
    newer: 'gemini-3.7-flash',
    why: "Google's only pro-tier id — no GA 3.x Pro exists; 3.7 is the flash tier.",
  },
  {
    older: 'kimi-k2.7-code',
    newer: 'kimi-k3',
    why: 'Coding specialist and the only cheap Moonshot tier ($0.95/$4 vs $3/$15).',
  },
  {
    older: 'qwen3-coder-plus',
    newer: 'qwen3.8-max',
    why: 'Coding specialist and the only cheap Alibaba tier; no newer coder id.',
  },
]

describe('model families', () => {
  const selectable = MODELS.filter(isSelectableModel)

  it('never offers two generations of the same family', () => {
    const allowed = new Set(INTENTIONAL_FAMILY_OVERLAPS.map((o) => `${o.older}|${o.newer}`))
    for (const a of selectable) {
      for (const b of selectable) {
        if (a.id === b.id) continue
        const famA = parseFamily(a.provider, a.id)
        const famB = parseFamily(b.provider, b.id)
        if (!famA || !famB || famA.key !== famB.key) continue
        if (cmpVersion(famB.version, famA.version) <= 0) continue
        // b is a strictly newer generation of a's family: a must be marked
        // `supersededBy` unless it is a documented different-tier exception.
        expect(
          allowed.has(`${a.id}|${b.id}`),
          `${a.id} is an older generation than ${b.id} — set supersededBy on it, ` +
            'or add a reviewed entry to INTENTIONAL_FAMILY_OVERLAPS explaining the tier split',
        ).toBe(true)
      }
    }
  })

  it('keeps every documented overlap real (both ids still selectable)', () => {
    // A stale exception would silently re-permit a genuine older generation.
    for (const overlap of INTENTIONAL_FAMILY_OVERLAPS) {
      expect(MODEL_IDS.has(overlap.older), overlap.older).toBe(true)
      expect(MODEL_IDS.has(overlap.newer), overlap.newer).toBe(true)
    }
  })

  it('leaves every provider with at least one selectable model', () => {
    for (const provider of new Set(MODELS.filter((m) => !m.disabled).map((m) => m.provider))) {
      expect(
        selectable.some((m) => m.provider === provider),
        provider,
      ).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Supersedence
// ---------------------------------------------------------------------------

describe('supersededBy', () => {
  const superseded = MODELS.filter((m) => m.supersededBy)

  it('points at an existing, selectable model from the same provider', () => {
    expect(superseded.length).toBeGreaterThan(0)
    for (const model of superseded) {
      const successor = getModel(model.supersededBy as string)
      expect(successor, `${model.id} → ${model.supersededBy}`).toBeDefined()
      expect(successor!.id, model.id).not.toBe(model.id)
      expect(successor!.provider, model.id).toBe(model.provider)
      // One hop only: a chain would leave a saved selection pointing at another
      // unselectable model.
      expect(isSelectableModel(successor!), `${model.id} → ${successor!.id}`).toBe(true)
    }
  })

  it('is a strictly newer generation of the same family', () => {
    for (const model of superseded) {
      const successor = getModel(model.supersededBy as string)!
      const famOld = parseFamily(model.provider, model.id)
      const famNew = parseFamily(successor.provider, successor.id)
      if (!famOld || !famNew || famOld.key !== famNew.key) continue // cross-line successor (e.g. a renamed family)
      expect(
        cmpVersion(famNew.version, famOld.version),
        `${model.id} → ${successor.id}`,
      ).toBeGreaterThan(0)
    }
  })

  it('keeps superseded models priceable and resolvable by id', () => {
    for (const model of superseded) {
      const found = getModel(model.id)
      expect(found, model.id).toBeDefined()
      expect(found!.inputPricePerMTok, model.id).toBeGreaterThan(0)
      expect(found!.outputPricePerMTok, model.id).toBeGreaterThan(0)
    }
  })

  it('makes exactly the older generations non-selectable', () => {
    // The user-visible contract: these ids no longer appear in the `/model`
    // picker. Listed explicitly so removing one is a deliberate edit.
    const expected: Record<string, string> = {
      'claude-opus-4-8': 'claude-opus-5',
      'claude-opus-4-7': 'claude-opus-5',
      'claude-opus-4-6': 'claude-opus-5',
      'claude-sonnet-4-6': 'claude-sonnet-5',
      'gpt-5.5': 'gpt-5.6-sol',
      'gpt-5.4': 'gpt-5.6-terra',
      'gpt-5.4-mini': 'gpt-5.6-luna',
      'gemini-3.5-flash': 'gemini-3.7-flash',
      'gemini-3.6-flash': 'gemini-3.7-flash',
      'grok-4.3': 'grok-4.5',
      'kimi-k2.6': 'kimi-k3',
      'kimi-k2.5': 'kimi-k3',
      'minimax-m2.7': 'minimax-m3',
      'minimax-m2.5': 'minimax-m3',
      'qwen3.7-max': 'qwen3.8-max',
      'glm-5': 'glm-5.2',
    }
    expect(Object.fromEntries(superseded.map((m) => [m.id, m.supersededBy]))).toEqual(expected)
    for (const [older, newer] of Object.entries(expected)) {
      expect(MODEL_IDS.has(older), older).toBe(false)
      expect(MODEL_IDS.has(newer), newer).toBe(true)
    }
  })
})

describe('resolveSelectableModelId', () => {
  it('forwards a superseded id to its successor', () => {
    expect(resolveSelectableModelId('qwen3.7-max')).toBe('qwen3.8-max')
    expect(resolveSelectableModelId('claude-opus-4-6')).toBe('claude-opus-5')
  })

  it('returns a selectable id unchanged', () => {
    expect(resolveSelectableModelId('claude-sonnet-5')).toBe('claude-sonnet-5')
  })

  it('returns undefined for unknown and disabled ids', () => {
    expect(resolveSelectableModelId('nonexistent-model')).toBeUndefined()
    // Retired upstream with no declared successor — nothing to forward to.
    expect(resolveSelectableModelId('grok-code-fast-1')).toBeUndefined()
  })

  it('resolves every catalog id to a selectable model or undefined', () => {
    for (const model of MODELS) {
      const resolved = resolveSelectableModelId(model.id)
      if (resolved === undefined) continue
      expect(MODEL_IDS.has(resolved), `${model.id} → ${resolved}`).toBe(true)
    }
  })
})

// ---------------------------------------------------------------------------
// Default region — every multi-region model leads with its cheapest host
// ---------------------------------------------------------------------------

describe('default processing region', () => {
  const multiRegion = MODELS.filter((m) => !m.disabled && (m.regions?.length ?? 0) > 1)

  // Rates are read through `modelRegionRates`, the SAME resolution metering
  // uses: a region's `regionPricing` override, else the base (native) rates,
  // with an override's omitted cache fields falling back to that region's input
  // price. So a region can never be "missing" cache pricing here — it inherits
  // a comparable number the way a real bill would.
  const ratesFor = (model: (typeof MODELS)[number], region: string) =>
    modelRegionRates(model, region)

  it('has models to check (the invariant is not vacuous)', () => {
    expect(multiRegion.length).toBeGreaterThan(0)
  })

  it('makes regions[0] the cheapest region on the workload we actually run', () => {
    // This asserted "cheapest on CACHE READS" until 2026-08-14. That was only
    // ever a proxy for the real rule — cheapest on our traffic — and it held
    // while cache reads were the whole gap between hosts (measured traffic is
    // ~94% cache hits, deepseek 2026-08-01). DeepSeek's 2026-08-16 rise broke
    // the proxy: CN keeps the cheaper reads yet loses on the blend, because
    // fresh input and output went up 1.6-3.1× against a flat re-host. Assert
    // the blend directly, so the invariant tracks the decision it stands for
    // instead of one input to it.
    const MIX = { cacheRead: 47_000, input: 3_000, output: 800 } // ~94% cache hits
    // Evaluated once every staged price change has landed: a default region is
    // chosen for the steady state the catalog is heading to, not for a window
    // of days before an announced switch. Collapses to "now" once staged
    // entries are folded into the base rates.
    const at = new Date(
      Math.max(
        Date.now(),
        ...MODELS.flatMap((m) =>
          m.scheduledPricing ? [Date.parse(m.scheduledPricing.effectiveFrom)] : [],
        ),
      ),
    )
    const blended = (model: (typeof MODELS)[number], region: string) => {
      const r = modelRegionRates(model, region, at)
      return (
        MIX.cacheRead * r.cacheReadPricePerMTok +
        MIX.input * r.inputPricePerMTok +
        MIX.output * r.outputPricePerMTok
      )
    }
    for (const model of multiRegion) {
      const regions = model.regions as string[]
      const def = blended(model, regions[0])
      for (const other of regions.slice(1)) {
        expect(
          def,
          `${model.id}: default region '${regions[0]}' costs ${def / 1e6} per turn on the ` +
            `agentic mix but '${other}' costs ${blended(model, other) / 1e6} — lead with the cheaper host`,
        ).toBeLessThanOrEqual(blended(model, other))
      }
    }
  })

  it('never leaves a region that beats the default on both other axes', () => {
    // Cheapest-on-cache-reads can still tie, and a tie must not hide a region
    // that is strictly cheaper on BOTH input and output — that region should
    // have been the default instead.
    for (const model of multiRegion) {
      const regions = model.regions as string[]
      const def = ratesFor(model, regions[0])
      for (const other of regions.slice(1)) {
        const alt = ratesFor(model, other)
        const beatsOnBoth =
          alt.inputPricePerMTok < def.inputPricePerMTok &&
          alt.outputPricePerMTok < def.outputPricePerMTok
        const noWorseOnCache = alt.cacheReadPricePerMTok <= def.cacheReadPricePerMTok
        expect(
          beatsOnBoth && noWorseOnCache,
          `${model.id}: region '${other}' is cheaper than the default '${regions[0]}' on input, ` +
            'output AND cache reads — make it the default',
        ).toBe(false)
      }
    }
  })

  it('declares a region list on every model of a provider that has a re-host', () => {
    // `regions` is optional and defaults to ['us'] (effectiveModelRegion), so a
    // model of a re-hosted provider that omits it silently routes to the US
    // bond, which only knows the ids in its modelMap. Declaring the list keeps
    // that decision in the catalog where the freshness gate can check it.
    const rehosted = new Set(
      MODELS.filter((m) => m.regionPricing && !m.disabled).map((m) => m.provider),
    )
    for (const model of MODELS) {
      if (model.disabled || !rehosted.has(model.provider)) continue
      expect(model.regions, `${model.id} (${model.provider} has a region re-host)`).toBeDefined()
    }
  })

  it('keeps kimi-k3 on the US host it is priced for', () => {
    const k3 = MODELS.find((m) => m.id === 'kimi-k3')!
    expect(k3.regions).toEqual(['us', 'cn'])
    expect(k3.regionPricing?.us).toEqual({
      inputPricePerMTok: 2.85,
      outputPricePerMTok: 14.25,
      cacheReadPricePerMTok: 0.285,
    })
    // No cache-write override → the region's input rate, per modelRegionRates.
    expect(modelRegionRates(k3, 'us').cacheWritePricePerMTok).toBe(2.85)
    // CN keeps the native rates even though it is no longer regions[0]: rate
    // resolution is `regionPricing[region] ?? base`, never "base == regions[0]".
    expect(modelRegionRates(k3, 'cn')).toEqual({
      inputPricePerMTok: 3,
      outputPricePerMTok: 15,
      cacheReadPricePerMTok: 0.3,
      cacheWritePricePerMTok: 3,
    })
  })

  it('does not make any new model free-tier selectable', () => {
    // Region work must never widen the free tier: exactly one model is free,
    // and exactly one carries the per-region carve-out.
    //
    // The carve-out holder must be whichever model molecule-dev sets as
    // `FREE_TIER_MODELS.plan` — it exists solely to keep THAT model usable on
    // the free tier, and `freeTierAllows` checks the pairing before it looks at
    // regions. So the two move together: it was deepseek-v4-pro until
    // 2026-08-14, and minimax-m3 since. A mismatch does not widen anything (the
    // pairing check fails closed), it just leaves a model claiming a free-tier
    // relationship it does not have.
    expect(MODELS.filter((m) => m.freeTier).map((m) => m.id)).toEqual(['deepseek-v4-flash'])
    expect(MODELS.filter((m) => m.freeTierRegions).map((m) => m.id)).toEqual(['minimax-m3'])
    // The carve-out must name a region the model actually offers, or the free
    // tier's own default is unselectable.
    const planner = MODELS.find((m) => m.freeTierRegions)!
    for (const region of planner.freeTierRegions!) {
      expect(planner.regions ?? ['us']).toContain(region)
    }
    const k3 = MODELS.find((m) => m.id === 'kimi-k3')!
    expect(k3.freeTier).toBeUndefined()
    expect(k3.freeTierRegions).toBeUndefined()
  })
})
