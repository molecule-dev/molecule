/**
 * Available AI models.
 *
 * This is the single source of truth for which models Synthase can use.
 * Server-side code (chat handler, compaction) consumes the full definitions
 * directly; clients receive the `PublicModel` projection from `GET /ai/models`.
 *
 * @module
 */

import type { ModelDefinition } from './types.js'

/**
 * All available AI models, grouped by provider, ordered from most to least capable.
 *
 * To add or remove a model, edit this array. Both the server-side validation
 * and the public discovery endpoint will update automatically.
 *
 * Effort is each model's OWN native value — there is no abstract scale (see
 * {@link ModelDefinition.supportedEffortLevels}):
 * - A model driven by a provider-native effort/level param lists its provider
 *   values verbatim in `supportedEffortLevels` (ascending), with
 *   `defaultEffortLevel` = the provider's default/recommended level for agentic
 *   coding. NO `effortBudgetTokens`.
 * - A model with a controllable token budget but no native level names (e.g.
 *   Claude Haiku 4.5's `budget_tokens`, Qwen's `thinking_budget`) lists
 *   scaled-budget labels (`['4K', '8K', '16K', '32K']`) with `effortBudgetTokens`
 *   mapping each label to the token budget it sends.
 * - A model whose reasoning is fixed (always-on or on/off only, no depth
 *   control) carries `thinkingConfigurable: false` and OMITS both fields —
 *   there is nothing to tune.
 *
 * ONE GENERATION PER FAMILY. When a provider ships a newer generation of a
 * model line, the older entry gets `supersededBy: '<newer id>'` and stops being
 * offered — the picker never shows both `qwen3.7-max` and `qwen3.8-max`. The
 * entry is NEVER deleted: `getModel()` still resolves it so saved selections and
 * historical usage stay priceable, and a persisted id resolves forward to the
 * successor. Supersede only within the same TIER: a cheaper or specialist model
 * with no newer equivalent (`gemini-3.1-pro-preview`, `qwen3-coder-plus`,
 * `kimi-k2.7-code`, `grok-build-0.1`) keeps at most `deprecatedAt`, so every
 * provider keeps a real choice. `__tests__/lookup.test.ts` fails on any two
 * selectable models of one family at different versions that aren't a
 * documented exception.
 *
 * Sources (verified 2026-07-28; OpenAI re-verified 2026-07-31 after the
 * 2026-07-30 GPT-5.6 repricing — cross-check prices against models.dev with
 * `npm run check:model-freshness` from the workspace root):
 * - Anthropic: https://platform.claude.com/docs/en/about-claude/models/overview
 *   + /docs/en/build-with-claude/effort (fable-5 / opus-5 / sonnet-5 current;
 *   opus-4-8 superseded by opus-5 at identical pricing but still served — it is
 *   the recommended refusal-fallback model; effort ladder on all three current
 *   models is low|medium|high|xhigh|max; budget_tokens 400s on 4.7+)
 *   (re-verified 2026-08-06: added opus-4-7 — legacy but Active, $5/$25,
 *   cache $0.50/$6.25, 1M ctx / 128K out per the overview + pricing pages;
 *   models.dev first listed it 2026-08-06)
 * - OpenAI: https://developers.openai.com/api/docs/pricing (GPT-5.6 family GA
 *   2026-07-09; REPRICED 2026-07-30: -luna cut 80% to $0.20/$1.20, -terra cut
 *   20% to $2/$12, -sol unchanged $5/$30; cache read 0.1× input; gpt-5.5/
 *   gpt-5.4 still listed as current; long-context 2× variants exist upstream —
 *   not modeled, same as the Gemini/Grok tiers; Sol "Fast mode" 2.5× speed at
 *   2× price announced 2026-07-30 — not yet modeled)
 * - Google: https://ai.google.dev/gemini-api/docs/pricing (gemini-3.6-flash GA
 *   2026-07-21 $1.50/$7.50 supersedes 3.5-flash as the agentic flagship;
 *   gemini-3.1-pro-preview still the pro tier — "3.5 Pro" has NOT shipped as
 *   of 2026-07-28 despite the coming-soon badge; do not add until it has an id)
 *   (re-verified 2026-08-13: gemini-3.7-flash "New Stable" — supersedes
 *   3.6-flash as the flash flagship at the SAME list price ($1.50/$7.50, cache
 *   read $0.15), with a launch promo ($0.75/$3.75, cache read $0.075) through
 *   2026-12-31 billed here at list; specs from /docs/models/gemini-3.7-flash:
 *   1M ctx / 65,536 out, thinking low|medium|high (no minimal), vision, tools,
 *   caching, search grounding, code execution, url context)
 * - xAI: https://docs.x.ai/developers/models + /developers/grok-4-5
 *   (grok-4.5 flagship 2026-07-08: $2/$6, 500K ctx, ≥200K prompts bill 2× —
 *   not modeled; reasoning_effort low|medium|high default high, image input;
 *   grok-4.3 still served at $1.25/$2.50 with the bigger 1M window;
 *   grok-code-fast-1 no longer listed — retires 2026-08-15)
 * - DeepSeek: https://api-docs.deepseek.com/quick_start/pricing (verified
 *   2026-08-14; legacy deepseek-chat/-reasoner ids fully retired 2026-07-24 —
 *   never in this catalog. V4-Pro GA on 2026-08-13 came with a price RISE
 *   effective 2026-08-16T16:00Z plus the long-announced peak-hour 2×: both
 *   entries carry it as `scheduledPricing`, so today's rates bill until that
 *   instant and the new ones after. Re-verify weekday-vs-daily peak windows and
 *   the CN/US region default once it lands — see the entries.)
 * - Moonshot: https://platform.kimi.ai/docs/models + DeepInfra's model API for
 *   the US re-host (kimi-k3 flagship 2026-07-16
 *   — 2.8T MoE, 1M ctx, $3/$15 — NOT added: thinking is forced-on with
 *   reasoning_content that must be replayed through tool loops, the same
 *   constraint that kept kimi-k2.7-code out. BOTH are now in the catalog: the
 *   moonshot bond gained preserved thinking (reasoning replayed through tool
 *   loops), so kimi-k3 is the Moonshot pick.)
 * - MiniMax: https://platform.minimax.io/docs/guides/pricing-paygo (unchanged;
 *   minimax-m3 $0.30/$1.20 is a "permanent 50% off" list rate)
 * - Alibaba: https://www.alibabacloud.com/help/en/model-studio/deep-thinking
 *   (qwen3.8-max GA'd 2026-08-03 on the pay-as-you-go international API and is
 *   IN the catalog — verified 2026-08-04: flat $2/$6 per MTok on
 *   help.aliyun.com/en/model-studio/model-pricing (Singapore International
 *   CNY 14.988/44.965 at the same fixed conversion that maps qwen3.7-max's
 *   CNY 18.736/56.207 to its $2.50/$7.50 list), 1M ctx, hybrid thinking,
 *   tools. Cache rates come from the ZH context-cache doc
 *   (help.aliyun.com/zh/model-studio/context-cache), which lists qwen3.8-max
 *   as supported in every region under the unconditional standard table
 *   (implicit: hit 20% of input, creation 100%; explicit: hit 10%, creation
 *   125%) — the EN edition of that doc simply lags (zero qwen3.8 mentions),
 *   which an earlier pass misread as "excepted/console-only". qwen3.7-max
 *   still runs its 50%-off promo — billed here at list, $2.50/$7.50)
 *   (re-verified 2026-08-15 against api.deepinfra.com/models/: qwen3.8-max's US
 *   re-host rates are unchanged — $1.65/$4.951, cache read 0.1248× input =
 *   $0.206. DeepInfra also began serving `Qwen/Qwen3.8-2.4T-A95B` on
 *   2026-08-12; by DeepInfra's own description it is the OPEN-WEIGHT variant of
 *   Qwen3.8 Max (2.4T MoE, 95B active), 262,144 ctx / 131,072 out, $2/$6 with
 *   cache read 0.1× input. NOT added: it is the same tier as qwen3.8-max, which
 *   the catalog already offers, and it costs MORE on that very host ($2/$6 vs
 *   $1.65/$4.951), so nothing would ever select it — and carrying both would
 *   put two selectable Alibaba flagships in one family. Revisit only if Alibaba
 *   publishes it as a distinct first-party DashScope model id.)
 * - Zhipu: https://docs.z.ai/guides/overview/pricing (unchanged; glm-5.2 is
 *   the newest — "GLM-5.3/5.5" rumors have no released ids as of 2026-07-28)
 *
 * Knowledge-cutoff dates on non-Anthropic entries are best-effort estimates
 * where the provider doesn't publish one; the provider sources above verify
 * id / pricing / context window.
 */
export const MODELS: readonly ModelDefinition[] = [
  // ---------------------------------------------------------------------------
  // Anthropic
  // Verified: https://platform.claude.com/docs/en/about-claude/models/overview
  //           https://platform.claude.com/docs/en/build-with-claude/effort
  // Effort is output_config.effort with adaptive thinking on 4.6+ models —
  // budget_tokens is REJECTED (400) on fable-5 / opus-4-8 / sonnet-5 and
  // deprecated on the 4.6 family. Only Haiku 4.5 still uses budget_tokens.
  // ---------------------------------------------------------------------------
  {
    id: 'claude-fable-5',
    provider: 'anthropic',
    label: 'Claude Fable 5',
    description: 'Most capable Anthropic — frontier reasoning & long-horizon agents',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffortLevel: 'high',
    // Thinking is ALWAYS ON (adaptive); effort is the only depth control.
    // Full five-level ladder (medium was missing here — Fable supports low
    // through max). Default/recommended is high; xhigh for the most
    // capability-sensitive work; low still performs well on routine tasks.
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search_20260209',
    codeExecutionToolType: 'code_execution_20250825',
    webFetchToolType: 'web_fetch_20260209',
    inputPricePerMTok: 10,
    outputPricePerMTok: 50,
    // Anthropic 5-minute prompt cache: read 0.1× input, write 1.25× input.
    cacheReadPricePerMTok: 1,
    cacheWritePricePerMTok: 12.5,
    knowledgeCutoff: '2026-01-01',
  },
  {
    id: 'claude-opus-5',
    provider: 'anthropic',
    label: 'Claude Opus 5',
    description: 'Anthropic Opus flagship — step-change agentic coding at 4.8 pricing',
    // Fast mode (research preview, Claude API only): same model at up to 2.5×
    // output speed, $10/$50 per MTok (2× standard; platform.claude.com fast-mode
    // docs, verified 2026-07-31). Cache rates follow Anthropic's standard
    // ratios (read 0.1× input, write 1.25× input) applied to the fast input
    // rate. Separate upstream rate limits from standard Opus.
    fastPricing: {
      inputPricePerMTok: 10,
      outputPricePerMTok: 50,
      cacheReadPricePerMTok: 1,
      cacheWritePricePerMTok: 12.5,
    },
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffortLevel: 'high',
    // Thinking on by default (adaptive); disabling is only valid at effort
    // high or below (xhigh/max + disabled → 400). Full five-level ladder;
    // Anthropic's rec: xhigh for coding/agentic, but low/medium punch far
    // above their weight on this model. 512-token prompt-cache minimum.
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search_20260209',
    codeExecutionToolType: 'code_execution_20250825',
    webFetchToolType: 'web_fetch_20260209',
    // Drop-in successor to Opus 4.8 at identical pricing.
    inputPricePerMTok: 5,
    outputPricePerMTok: 25,
    // Anthropic 5-minute prompt cache: read 0.1× input, write 1.25× input.
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 6.25,
    // Not published at verification time — best-effort estimate (≥ Opus 4.8's).
    knowledgeCutoff: '2026-01-01',
  },
  {
    id: 'claude-opus-4-8',
    provider: 'anthropic',
    label: 'Claude Opus 4.8',
    description: 'Previous Opus — deep reasoning; the opus-5 refusal fallback',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffortLevel: 'high',
    // Full five-level ladder (medium was missing here). Anthropic's rec for
    // coding/agentic on Opus 4.8 is xhigh; the API default is high.
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search_20260209',
    codeExecutionToolType: 'code_execution_20250825',
    webFetchToolType: 'web_fetch_20260209',
    inputPricePerMTok: 5,
    outputPricePerMTok: 25,
    // Anthropic 5-minute prompt cache: read 0.1× input, write 1.25× input.
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 6.25,
    knowledgeCutoff: '2026-01-01',
    // Superseded by claude-opus-5 (same price, same tier); still served upstream
    // and the recommended refusal-fallback target, so it stays priceable and
    // callable by id — it is just not OFFERED, since opus-5 is a drop-in.
    deprecatedAt: '2026-07-28',
    supersededBy: 'claude-opus-5',
  },
  {
    id: 'claude-sonnet-5',
    provider: 'anthropic',
    label: 'Claude Sonnet 5',
    description: 'Fast & capable — near-Opus coding at Sonnet cost',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffortLevel: 'high',
    // Adaptive thinking on by default; full five-level ladder (medium was
    // missing here). Default/rec is high, xhigh for the hardest coding/agentic
    // tasks, medium ≈ Sonnet 4.6 at high.
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search_20260209',
    codeExecutionToolType: 'code_execution_20250825',
    webFetchToolType: 'web_fetch_20260209',
    // Standard pricing. Intro pricing ($2/$10) applies through 2026-08-31 —
    // billed here at standard so metering never under-charges; revisit after.
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    // Anthropic 5-minute prompt cache: read 0.1× input, write 1.25× input.
    cacheReadPricePerMTok: 0.3,
    cacheWritePricePerMTok: 3.75,
    knowledgeCutoff: '2026-01-01',
  },
  {
    id: 'claude-opus-4-7',
    provider: 'anthropic',
    label: 'Claude Opus 4.7',
    description: 'Older Opus — long-horizon agentic work, knowledge work & vision',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh', 'max'],
    defaultEffortLevel: 'high',
    // Adaptive thinking only — budget_tokens is REJECTED (400); xhigh effort
    // debuted on this model. Unlike opus-5, omitting `thinking` runs WITHOUT
    // thinking — set {type:"adaptive"} explicitly. First model on the new
    // tokenizer (~30% more tokens than 4.6 for the same text).
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search_20260209',
    codeExecutionToolType: 'code_execution_20250825',
    webFetchToolType: 'web_fetch_20260209',
    inputPricePerMTok: 5,
    outputPricePerMTok: 25,
    // Anthropic 5-minute prompt cache: read 0.1× input, write 1.25× input.
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 6.25,
    knowledgeCutoff: '2026-01-01',
    // Superseded by claude-opus-4-8 (launched 2026-05-28) at identical pricing;
    // still Active upstream (deprecations page 2026-08-06: retires no sooner
    // than 2027-04-16). NO fast mode — speed:"fast" on 4.7 returns an error
    // (pricing page, fast-mode section). `supersededBy` names the CURRENT
    // selectable Opus (opus-5), not the also-superseded 4.8, so a saved
    // selection resolves forward in one hop.
    deprecatedAt: '2026-05-28',
    supersededBy: 'claude-opus-5',
  },
  {
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    label: 'Claude Opus 4.6',
    description: 'Previous-generation Opus — deep reasoning & complex tasks',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'max'],
    defaultEffortLevel: 'medium',
    // No xhigh on the 4.6 family; budget_tokens still accepted but deprecated —
    // adaptive + effort is the recommended control.
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search_20260209',
    codeExecutionToolType: 'code_execution_20250825',
    webFetchToolType: 'web_fetch_20260209',
    inputPricePerMTok: 5,
    outputPricePerMTok: 25,
    // Anthropic 5-minute prompt cache: read 0.1× input, write 1.25× input.
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 6.25,
    knowledgeCutoff: '2025-05-01',
    // Superseded by the current Opus (opus-5) — kept priceable, not offered.
    deprecatedAt: '2026-06-16',
    supersededBy: 'claude-opus-5',
  },
  {
    id: 'claude-sonnet-4-6',
    provider: 'anthropic',
    label: 'Claude Sonnet 4.6',
    description: 'Previous-generation Sonnet — fast & balanced',
    contextWindow: 1_000_000,
    // Was wrongly 64K — Sonnet 4.6 supports 128K output (models overview).
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 10_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'max'],
    defaultEffortLevel: 'medium',
    // No xhigh on the 4.6 family. Anthropic's recommended default for agentic
    // coding on Sonnet 4.6 is medium (= M); high is its API default (= L).
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search_20260209',
    codeExecutionToolType: 'code_execution_20250825',
    webFetchToolType: 'web_fetch_20260209',
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    // Anthropic 5-minute prompt cache: read 0.1× input, write 1.25× input.
    cacheReadPricePerMTok: 0.3,
    cacheWritePricePerMTok: 3.75,
    knowledgeCutoff: '2025-08-01',
    // Superseded by claude-sonnet-5 (same tier) — kept priceable, not offered.
    deprecatedAt: '2026-07-07',
    supersededBy: 'claude-sonnet-5',
  },
  {
    id: 'claude-haiku-4-5-20251001',
    provider: 'anthropic',
    label: 'Claude Haiku 4.5',
    description: 'Fastest Anthropic — quick tasks & iteration',
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    thinkingConfigurable: true,
    // Haiku 4.5 does NOT support output_config.effort (400) or adaptive
    // thinking — it stays on the budget_tokens path, so its levels are
    // budget labels (effortBudgetTokens), not a native effort param.
    supportedEffortLevels: ['4K', '8K', '16K', '32K'],
    defaultEffortLevel: '8K',
    effortBudgetTokens: { '4K': 4000, '8K': 8000, '16K': 16000, '32K': 32000 },
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search_20250305',
    webFetchToolType: 'web_fetch_20250910',
    inputPricePerMTok: 1,
    outputPricePerMTok: 5,
    // Anthropic 5-minute prompt cache: read 0.1× input, write 1.25× input.
    cacheReadPricePerMTok: 0.1,
    cacheWritePricePerMTok: 1.25,
    knowledgeCutoff: '2025-02-01',
  },

  // ---------------------------------------------------------------------------
  // OpenAI
  // Verified: https://developers.openai.com/api/docs/pricing (2026-07-28)
  // GPT-5.6 family GA 2026-07-09: gpt-5.6 is an alias for gpt-5.6-sol; Sol is
  // the frontier tier, Terra the balanced tier, Luna the cheap/fast tier.
  // Cached input is billed at 0.1× input. The official pricing page shows no
  // cache-WRITE premium, but third-party trackers report 1.25× with a 30-min
  // cache life for the 5.6 family — billed here at 1.25× (conservative;
  // re-verify against the official docs). reasoning_effort values for 5.6 are
  // not yet on the docs page — carried over from gpt-5.5 (low|medium|high|
  // xhigh, default medium); re-verify. Long-context 2× price variants exist
  // upstream — not modeled (same as the Gemini/Grok >200K tiers).
  // ---------------------------------------------------------------------------
  {
    id: 'gpt-5.6-sol',
    provider: 'openai',
    label: 'GPT-5.6 Sol',
    description: 'OpenAI frontier — the hardest coding & reasoning work',
    // Reported as 1.05M; floored to 1M until the docs state it (understating
    // only makes compaction slightly earlier — overstating risks overflow).
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultEffortLevel: 'medium',
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // Tools + ANY reasoning is a 400 on /v1/chat/completions for this family.
    toolsRequireReasoningOff: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    inputPricePerMTok: 5,
    outputPricePerMTok: 30,
    // Cached input 0.1× input; write premium reported 1.25× (see section note).
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 6.25,
    // Not published — best-effort estimate.
    knowledgeCutoff: '2026-03-01',
  },
  {
    id: 'gpt-5.6-terra',
    provider: 'openai',
    label: 'GPT-5.6 Terra',
    description: 'Balanced OpenAI — everyday coding & tool use',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultEffortLevel: 'medium',
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // Tools + ANY reasoning is a 400 on /v1/chat/completions for this family.
    toolsRequireReasoningOff: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    // Repriced 2026-07-30 (20% cut from $2.50/$15).
    inputPricePerMTok: 2,
    outputPricePerMTok: 12,
    // Cached input 0.1× input; write premium reported 1.25× (see section note).
    cacheReadPricePerMTok: 0.2,
    cacheWritePricePerMTok: 2.5,
    // Not published — best-effort estimate.
    knowledgeCutoff: '2026-03-01',
  },
  {
    id: 'gpt-5.6-luna',
    provider: 'openai',
    label: 'GPT-5.6 Luna',
    description: 'Fast & cheap OpenAI — light tasks & subagents',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultEffortLevel: 'medium',
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // Tools + ANY reasoning is a 400 on /v1/chat/completions for this family.
    toolsRequireReasoningOff: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    // Repriced 2026-07-30 (80% cut from $1/$6).
    inputPricePerMTok: 0.2,
    outputPricePerMTok: 1.2,
    // Cached input 0.1× input; write premium reported 1.25× (see section note).
    cacheReadPricePerMTok: 0.02,
    cacheWritePricePerMTok: 0.25,
    // Not published — best-effort estimate.
    knowledgeCutoff: '2026-03-01',
  },
  {
    id: 'gpt-5.5',
    provider: 'openai',
    label: 'GPT-5.5',
    description: 'OpenAI flagship — strong coding & tool use',
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultEffortLevel: 'medium',
    // OpenAI default + agentic-coding rec is medium (= M); 'none' is not
    // offered (it disables reasoning outright).
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // Tools + ANY reasoning is a 400 on /v1/chat/completions for this family.
    toolsRequireReasoningOff: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    inputPricePerMTok: 5,
    outputPricePerMTok: 30,
    // OpenAI auto-caches at no write premium; cached input billed at 0.1× input.
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 5,
    knowledgeCutoff: '2025-12-01',
    // Superseded by gpt-5.6-sol (same frontier tier, same $5/$30); still listed
    // as current by OpenAI, so it stays priceable — it is just not offered.
    deprecatedAt: '2026-07-09',
    supersededBy: 'gpt-5.6-sol',
  },
  {
    id: 'gpt-5.4',
    provider: 'openai',
    label: 'GPT-5.4',
    description: 'Affordable OpenAI frontier — strong coding & tool use',
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultEffortLevel: 'medium',
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // Tools + ANY reasoning is a 400 on /v1/chat/completions for this family.
    toolsRequireReasoningOff: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 15,
    // OpenAI auto-caches at no write premium; cached input billed at 0.1× input.
    cacheReadPricePerMTok: 0.25,
    cacheWritePricePerMTok: 2.5,
    knowledgeCutoff: '2025-08-31',
    // OpenAI still lists gpt-5.4 as current, but gpt-5.6-terra covers this
    // balanced tier for LESS ($2/$12 vs $2.50/$15) — superseded, so the picker
    // offers only the 5.6 generation (this is OUR taxonomy, not OpenAI's
    // deprecations page; the model stays priceable).
    deprecatedAt: '2026-07-28',
    supersededBy: 'gpt-5.6-terra',
  },
  {
    id: 'gpt-5.4-mini',
    provider: 'openai',
    label: 'GPT-5.4 mini',
    description: 'Cheap & fast OpenAI — light coding tasks & subagents',
    contextWindow: 400_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high', 'xhigh'],
    defaultEffortLevel: 'medium',
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // Tools + ANY reasoning is a 400 on /v1/chat/completions for this family.
    toolsRequireReasoningOff: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    inputPricePerMTok: 0.75,
    outputPricePerMTok: 4.5,
    // OpenAI auto-caches at no write premium; cached input billed at 0.1× input.
    cacheReadPricePerMTok: 0.075,
    cacheWritePricePerMTok: 0.75,
    knowledgeCutoff: '2025-08-31',
    // Superseded by gpt-5.6-luna, which IS the newer cheap/fast tier and is
    // strictly better on every axis that made this the budget pick: $0.20/$1.20
    // vs $0.75/$4.50 after the 2026-07-30 repricing, and a 1M window vs 400K.
    // Hiding it therefore costs OpenAI no cheap option. Stays priceable.
    deprecatedAt: '2026-08-01',
    supersededBy: 'gpt-5.6-luna',
  },

  // ---------------------------------------------------------------------------
  // Google
  // Verified: https://ai.google.dev/gemini-api/docs/models
  //           https://ai.google.dev/gemini-api/docs/pricing
  //           https://ai.google.dev/gemini-api/docs/thinking
  // Reasoning control is `thinking_level` (minimal|low|medium|high — cannot be
  // fully off on 3.x; combining with legacy thinking_budget returns 400).
  // NOTE: the previous catalog carried a fictional "gemini-3.1-pro" GA id — no
  // such model exists; the pro tier is (still) gemini-3.1-pro-preview. Safe to
  // replace outright: the google bond has never been implemented/wired, so no
  // historical usage can reference the old ids.
  // ---------------------------------------------------------------------------
  {
    id: 'gemini-3.7-flash',
    provider: 'google',
    label: 'Gemini 3.7 Flash',
    description: 'Google agentic flagship — complex coding & multi-step execution',
    // Verified against /docs/models/gemini-3.7-flash (2026-08-13).
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsThinking: true,
    thinkingBudgetTokens: 10_000,
    thinkingConfigurable: true,
    // thinking_level low|medium|high — minimal NOT supported on this model.
    supportedEffortLevels: ['low', 'medium', 'high'],
    defaultEffortLevel: 'medium',
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'google_search',
    codeExecutionToolType: 'code_execution',
    webFetchToolType: 'url_context',
    // "New Stable" 2026-08-13. LIST price $1.50/$7.50 — same as 3.6-flash.
    // Google runs a launch promo ($0.75/$3.75, cache read $0.075) through
    // 2026-12-31; billed here at standard list so metering never under-charges
    // (same policy as claude-sonnet-5's intro pricing — see the matching
    // KNOWN_DIVERGENCES entry in scripts/check-model-freshness.mjs, expiring
    // 2026-12-31).
    inputPricePerMTok: 1.5,
    outputPricePerMTok: 7.5,
    // Gemini context cache: read $0.15/M (0.1× input), no write premium
    // (storage billed separately per hour — not modeled).
    cacheReadPricePerMTok: 0.15,
    cacheWritePricePerMTok: 1.5,
    // Not on Google's docs — models.dev reports 2026-03 (lead, not authority).
    knowledgeCutoff: '2026-03-01',
  },
  {
    id: 'gemini-3.6-flash',
    provider: 'google',
    label: 'Gemini 3.6 Flash',
    description: 'Previous Google agentic flagship — frontier intelligence + grounding',
    // Window/output not on the pricing page — carried over from 3.5-flash;
    // re-verify against /docs/models.
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsThinking: true,
    thinkingBudgetTokens: 10_000,
    thinkingConfigurable: true,
    // thinking_level assumed unchanged from 3.5-flash (low|medium|high);
    // re-verify against /docs/thinking.
    supportedEffortLevels: ['low', 'medium', 'high'],
    defaultEffortLevel: 'medium',
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'google_search',
    codeExecutionToolType: 'code_execution',
    webFetchToolType: 'url_context',
    // GA 2026-07-21 — same input price as 3.5-flash, CHEAPER output ($7.50 vs $9).
    inputPricePerMTok: 1.5,
    outputPricePerMTok: 7.5,
    // Gemini context cache: read $0.15/M (0.1× input), no write premium
    // (storage billed separately per hour — not modeled).
    cacheReadPricePerMTok: 0.15,
    cacheWritePricePerMTok: 1.5,
    // Not published — best-effort estimate.
    knowledgeCutoff: '2026-01-01',
    // Superseded by gemini-3.7-flash (2026-08-13) — same flash tier, same list
    // price; Google's own models page now calls 3.6 "previous-generation".
    // Still served upstream, so it stays priceable.
    deprecatedAt: '2026-08-13',
    supersededBy: 'gemini-3.7-flash',
  },
  {
    id: 'gemini-3.5-flash',
    provider: 'google',
    label: 'Gemini 3.5 Flash',
    description: 'Previous Google agentic flagship — fast, 1M context',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsThinking: true,
    thinkingBudgetTokens: 10_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high'],
    defaultEffortLevel: 'medium',
    // thinking_level: default medium (= M); Google recommends high (= L) for
    // advanced coding/multi-step planning. 'minimal' exists below low; no
    // fourth upward tier, so XL is not offered.
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'google_search',
    codeExecutionToolType: 'code_execution',
    webFetchToolType: 'url_context',
    inputPricePerMTok: 1.5,
    outputPricePerMTok: 9,
    // Gemini context cache: read $0.15/M (0.1× input), no write premium
    // (storage billed separately per hour — not modeled).
    cacheReadPricePerMTok: 0.15,
    cacheWritePricePerMTok: 1.5,
    knowledgeCutoff: '2025-01-01',
    // Superseded within the flash tier (first by 3.6-flash on 2026-07-21, now
    // pointed one hop to gemini-3.7-flash — supersededBy must target a
    // SELECTABLE model, never a chain). Still served upstream, so it stays
    // priceable.
    deprecatedAt: '2026-07-21',
    supersededBy: 'gemini-3.7-flash',
  },
  {
    id: 'gemini-3.1-pro-preview',
    provider: 'google',
    label: 'Gemini 3.1 Pro',
    description: 'Google pro tier — deep reasoning (preview id; no GA id exists)',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsThinking: true,
    thinkingBudgetTokens: 10_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'medium', 'high'],
    defaultEffortLevel: 'medium',
    // thinking_level: low|medium|high only (no minimal). Google's API default
    // for this model is high (= L); M offers the cost step-down.
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'google_search',
    codeExecutionToolType: 'code_execution',
    webFetchToolType: 'url_context',
    // ≤200K-token prompts; >200K bills $4/$18 (tiering not modeled).
    inputPricePerMTok: 2,
    outputPricePerMTok: 12,
    // Gemini context cache: read $0.20/M (≤200K), no write premium (hourly
    // storage not modeled).
    cacheReadPricePerMTok: 0.2,
    cacheWritePricePerMTok: 2,
    knowledgeCutoff: '2025-01-01',
    // NOT superseded despite the lower version number: this is Google's only
    // PRO-tier id (no GA "3.5/3.6 Pro" exists), and the 3.6 flash flagship is a
    // different tier. Superseding it would leave Google with no deep-reasoning
    // option at all — see `ModelDefinition.supersededBy` (same-tier rule).
  },

  // ---------------------------------------------------------------------------
  // xAI (Grok)
  // Verified: https://docs.x.ai/developers/models + /developers/grok-4-5
  //           (2026-07-28)
  // grok-4.5 (2026-07-08) is the flagship: 500K ctx, reasoning_effort
  // low|medium|high default high, image input. grok-4.3 stays served as the
  // value tier with the BIGGER 1M window (reasoning_effort none|low|medium|
  // high, default low). Max output tokens still not documented for any model.
  // ---------------------------------------------------------------------------
  {
    id: 'grok-4.5',
    provider: 'xai',
    label: 'Grok 4.5',
    description: 'xAI frontier — coding, agentic tasks & knowledge work',
    contextWindow: 500_000,
    // Max output not documented by xAI — conservative cap.
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    // reasoning_effort low|medium|high, default high (docs.x.ai/developers/
    // grok-4-5) — no 'none' tier on 4.5, unlike 4.3.
    supportedEffortLevels: ['low', 'medium', 'high'],
    defaultEffortLevel: 'high',
    // Multimodal input (text + images), text out.
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // ≤200K-token prompts; ≥200K bills 2× ($4/$0.60/$12 — tiering not
    // modeled, same as the Gemini 3.1 Pro >200K tier).
    inputPricePerMTok: 2,
    outputPricePerMTok: 6,
    // xAI cached input billed at a flat $0.30/M, no write premium.
    cacheReadPricePerMTok: 0.3,
    cacheWritePricePerMTok: 2,
    // Official (docs.x.ai): 2026-02-01.
    knowledgeCutoff: '2026-02-01',
  },
  {
    id: 'grok-4.3',
    provider: 'xai',
    label: 'Grok 4.3',
    description: 'xAI value tier — fast reasoning, bigger 1M context',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['none', 'low', 'medium', 'high'],
    defaultEffortLevel: 'low',
    // xAI's default (and its own retirement-routing choice for agentic
    // workloads) is low (= M); none (= S) disables reasoning for a true fast
    // mode; step up for hard debugging/architecture turns.
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 2.5,
    // xAI cached input billed at a flat $0.20/M, no write premium.
    cacheReadPricePerMTok: 0.2,
    cacheWritePricePerMTok: 1.25,
    knowledgeCutoff: '2025-12-01',
    // Superseded by grok-4.5: the previous version of the same general-purpose
    // Grok line, not a separately-named tier. It keeps a bigger window (1M vs
    // 500K) and a lower price, which is why it was previously left selectable —
    // but offering two generations of one family is exactly what the picker no
    // longer does, and grok-4.5 is xAI's own recommendation. Stays priceable.
    deprecatedAt: '2026-07-28',
    supersededBy: 'grok-4.5',
  },
  {
    id: 'grok-build-0.1',
    provider: 'xai',
    label: 'Grok Build',
    description: 'Agentic coding specialist — fast & cheap (public beta)',
    contextWindow: 256_000,
    // Max output not documented by xAI — conservative cap.
    maxOutputTokens: 64_000,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    // Reasoning is always on and NOT configurable (reasoning_effort is not
    // honored on grok-build) — successor to grok-code-fast-1 (that slug now
    // auto-routes here).
    thinkingConfigurable: false,
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 1,
    outputPricePerMTok: 2,
    // xAI cached input billed at a flat $0.20/M, no write premium.
    cacheReadPricePerMTok: 0.2,
    cacheWritePricePerMTok: 1,
    // Not published by xAI — best-effort estimate (grok-4-generation base).
    knowledgeCutoff: '2025-06-01',
    // Niche coding beta; grok-4.5 is the xAI pick — kept out of the main list.
    // NOT superseded: its own family (grok-build) has no newer version, and it
    // is xAI's cheapest tool-capable model, so it stays selectable under
    // "Older models" (and is the deliberately-weak live selftest target).
    deprecatedAt: '2026-07-28',
  },
  {
    id: 'grok-4.20-multi-agent-beta-0309',
    provider: 'xai',
    label: 'Grok 4.20',
    description: 'Older xAI flagship — multi-agent',
    // Current xAI docs list 1M (the old 2M figure is stale). This beta slug is
    // an alias of the canonical grok-4.20-multi-agent-0309 — kept under the
    // original id so saved selections + historical usage stay priceable.
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    // On the multi-agent model reasoning_effort controls AGENT COUNT, not
    // reasoning depth — do not drive it from the effort setting.
    thinkingConfigurable: false,
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // Repriced by xAI when grok-4.3 launched (was $2/$6).
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 2.5,
    // xAI cached input billed at a flat $0.20/M, no write premium.
    cacheReadPricePerMTok: 0.2,
    cacheWritePricePerMTok: 1.25,
    knowledgeCutoff: '2024-11-01',
    deprecatedAt: '2026-04-30',
    // DISABLED, not deleted: xAI rejects this model on the chat-completions
    // endpoint outright — "Multi Agent requests are not allowed on chat
    // completions" (400 on every call, verified live 2026-07-30) — so offering
    // it in the picker only hands users a model that cannot answer. Their API
    // also lists the canonical slug as `grok-4.20-multi-agent-0309` (no
    // `beta-`), with `grok-4.20-0309-reasoning` / `-non-reasoning` as the
    // chat-completions-capable variants if this family is wanted back.
    // Stays in the catalogue so saved selections and past usage remain priceable.
    disabled: true,
  },
  {
    id: 'grok-code-fast-1',
    provider: 'xai',
    label: 'Grok Code',
    description: 'Code specialist — fast & cheap',
    contextWindow: 256_000,
    maxOutputTokens: 64_000,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.2,
    outputPricePerMTok: 1.5,
    // xAI cached input billed at a discount (≈0.25× input), no write premium.
    cacheReadPricePerMTok: 0.05,
    cacheWritePricePerMTok: 0.2,
    knowledgeCutoff: '2024-11-01',
    // Deprecated by xAI 2026-05-15 (retires 2026-08-15; the slug auto-routes to
    // grok-build-0.1 until then) — disabled: removed from selection + the
    // public listing, but getModel() still prices any historical usage. NEVER
    // delete.
    disabled: true,
  },

  // ---------------------------------------------------------------------------
  // DeepSeek
  // Verified: https://api-docs.deepseek.com/quick_start/pricing
  //           https://api-docs.deepseek.com/guides/thinking_mode
  //           https://api-docs.deepseek.com/updates/ (2026-08-14)
  // 2026-08-13: V4-Pro GA — and with it the price rise that the "coming soon"
  // note below had been waiting on. It is STAGED, not applied: both models
  // carry `scheduledPricing` effective 2026-08-16T16:00Z, so the catalog bills
  // today's verified rates until that instant and the new ones after it, with
  // nobody landing an edit at 16:00 UTC on a Sunday. The new card is
  // off-peak/peak (peak = exactly 2× off-peak), so it maps onto base rates +
  // `peakPricing` multiplier 2 — which is why the peak windows removed below
  // come back here rather than as flat rates.
  //   pro   off-peak 0.66 / 1.98, cache hit 0.022  (peak 1.32 / 3.96 / 0.044)
  //   flash off-peak 0.22 / 0.66, cache hit 0.007  (peak 0.44 / 1.32 / 0.014)
  // Cache HITS are the real move — pro 0.003625 → 0.022 (6.1×) off-peak, 0.044
  // (12.1×) at peak — and agentic input is ~94% cache hits, so effective input
  // cost rises far more than the list prices suggest. Both are free-tier models
  // (flash is `freeTier`, pro is the free-tier planner) on the CN default.
  // TWO things to re-verify once it lands (2026-08-17):
  //   1. WEEKDAYS OR DAILY. The rate card says only "Peak hours are 01:00 -
  //      04:00 and 06:00 - 10:00 UTC (all other hours are off-peak)" with no
  //      day qualifier, so the windows below are DAILY per the provider's own
  //      doc; press coverage described them as weekday-only. `peakPricing` has
  //      no day-of-week concept, so if it is weekday-only this over-bills every
  //      weekend peak window and needs the field extended, not the numbers
  //      nudged.
  //   2. THE CN-VS-US DEFAULT. `regions: ['cn', 'us']` defaults to CN on an
  //      owner decision (2026-08-01) taken when CN ran ~5.7× cheaper on real
  //      traffic. Post-change DeepInfra's US flash rates (0.08/0.18/0.016) are
  //      BELOW CN's new off-peak on both input and output — CN wins only on
  //      cache reads. Re-derive against measured cache-hit ratios before
  //      leaving the default where it is.
  // 2026-07-31: DeepSeek-V4-Flash OFFICIAL API launched in public beta — the
  // SAME `deepseek-v4-flash` id now serves the re-post-trained 0731 build
  // (same architecture/size; much stronger agent benchmarks — beats
  // V4-Pro-Preview on Terminal Bench 2.1 / DeepSWE).
  // OpenAI/Anthropic-compatible API; text/code only (no vision); 1M context,
  // 384K max output, automatic context (prompt) caching with ABSOLUTE cache-hit
  // prices (~1/50–1/120 of miss — not the old 0.1× rule). Launch discount made
  // PERMANENT 2026-05-23 (Pro $1.74/$3.48 → $0.435/$0.87), and ENDED by the
  // 2026-08-16 rise above. Thinking now defaults ENABLED upstream and supports tool calling
  // (reasoning_effort: high|max), BUT tool loops in thinking mode must replay
  // assistant reasoning_content on every subsequent request (400 on omission).
  // The bond explicitly sends thinking:{type:"disabled"} — Synthase runs
  // DeepSeek as a non-thinking executor (Sonnet plans; DeepSeek executes).
  // ---------------------------------------------------------------------------
  {
    id: 'deepseek-v4-pro',
    provider: 'deepseek',
    label: 'DeepSeek V4 Pro',
    description: 'Frontier-class — rivals top models at low cost',
    contextWindow: 1_000_000,
    maxOutputTokens: 384_000,
    // Run non-thinking (see section note): the executor tool loop would have to
    // replay reasoning_content across every turn in thinking mode.
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.435,
    outputPricePerMTok: 0.87,
    // DeepSeek automatic context cache: absolute cache-hit price ($/M).
    cacheReadPricePerMTok: 0.003625,
    cacheWritePricePerMTok: 0.435,
    // Native-China DEFAULT (owner decision 2026-08-01, re-derived 2026-08-14):
    // the US re-host (DeepInfra) bills ~3× list and ~28× cache reads, and
    // agentic input is ~94% cache hits, so US processing ran ~5.7× native on
    // real traffic. The 2026-08-16 rise narrows that to ~2.3× — still decisive,
    // so Pro stays CN while Flash flipped to US (see its note). Users opt into
    // US per model via the picker's region control.
    regions: ['cn', 'us'],
    // No freeTierRegions: the free tier stopped planning with this model on
    // 2026-08-14 (minimax-m3 took over — cheaper, and it beat this model on the
    // selection self-test). The carve-out only ever existed to keep the free
    // tier's OWN plan default usable, and `freeTierAllows` checks
    // `FREE_TIER_MODELS[mode] === modelId` before it looks at regions, so
    // leaving it here would widen nothing — it would just claim a free-tier
    // relationship that no longer exists.
    // US = DeepInfra, verified 2026-08-15 via api.deepinfra.com/models/
    // deepseek-ai/DeepSeek-V4-Pro. No cache-write premium (omitted → region
    // input rate). DeepInfra also serves the dated `-0813` snapshot (the
    // official release superseding the preview weights the bare id carries) at
    // IDENTICAL rates — so bumping the molecule-dev us modelMap to it moves no
    // price here; it is a weights decision, not a pricing one.
    regionPricing: {
      us: { inputPricePerMTok: 1.3, outputPricePerMTok: 2.6, cacheReadPricePerMTok: 0.1 },
    },
    // The peak-hour 2× surcharge is now ON the rate card with a dated switch
    // (2026-08-13 announcement, effective 2026-08-16T16:00Z) — so it is staged
    // below rather than live. The previously pre-wired windows had been REMOVED
    // for over-billing every peak-window turn 2× for weeks against a rate card
    // that showed a single flat rate; staging is what keeps this from repeating
    // in the other direction. Peak = 01:00-04:00 and 06:00-10:00 UTC (Beijing
    // business hours), which is 2× the off-peak rates exactly.
    scheduledPricing: {
      effectiveFrom: '2026-08-16T16:00:00Z',
      inputPricePerMTok: 0.66,
      outputPricePerMTok: 1.98,
      cacheReadPricePerMTok: 0.022,
      // DeepSeek charges no cache-write premium — write bills at input.
      cacheWritePricePerMTok: 0.66,
      peakPricing: {
        windows: [
          { startMinuteUtc: 60, endMinuteUtc: 240 },
          { startMinuteUtc: 360, endMinuteUtc: 600 },
        ],
        multiplier: 2,
      },
      source: 'https://api-docs.deepseek.com/quick_start/pricing/',
    },
    // Not published by DeepSeek — best-effort estimate.
    knowledgeCutoff: '2025-07-01',
  },
  {
    id: 'deepseek-v4-flash',
    provider: 'deepseek',
    label: 'DeepSeek V4 Flash',
    description: 'Ultra-cheap & fast — economical agentic coding',
    contextWindow: 1_000_000,
    maxOutputTokens: 384_000,
    // Non-thinking (see section note) — also the right tradeoff for a cheap,
    // fast tool-calling executor.
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    // Free-tier default: cheapest model + a fast, non-thinking tool-calling
    // executor — the model the IDE picks when none is chosen. Exactly one model
    // in this catalog may carry freeTier (enforced by lookup.test.ts).
    freeTier: true,
    inputPricePerMTok: 0.14,
    outputPricePerMTok: 0.28,
    // DeepSeek automatic context cache: absolute cache-hit price ($/M).
    cacheReadPricePerMTok: 0.0028,
    cacheWritePricePerMTok: 0.14,
    // US (DeepInfra) DEFAULT as of 2026-08-16 — flipped from CN when DeepSeek's
    // rise landed (owner decision 2026-08-14). CN was cheaper on real traffic
    // only because of its cache reads; the rise takes those from $0.0028 to
    // $0.007 (peak $0.014) against DeepInfra's flat $0.016, which is no longer
    // enough to carry the 1.6-3.1x it now loses on fresh input and output. On
    // the agentic mix this model actually serves (~94% cache hits) US is
    // cheaper at EVERY hour: 0.114c/turn flat vs 0.152c off-peak and 0.303c at
    // peak. It is also flat-rate, so free-tier cost stops varying by Beijing
    // business hours. Re-derive if the cache-hit ratio drops much below ~90%,
    // where CN's cheaper reads start winning again. This deliberately splits
    // the plan/execute pair across regions — Pro stays CN because its US
    // re-host is ~2.3x its own native rate even after the rise.
    regions: ['us', 'cn'],
    // US = DeepInfra, verified 2026-08-13 against the id the bond actually
    // sends: `deepseek-ai/DeepSeek-V4-Flash-0731`, the official release that
    // supersedes the preview weights still served under the un-dated id
    // (cents_per_input_token 0.000008, cents_per_output_token 0.000018,
    // rate_per_input_token_cached 0.2 → cache read = 0.2 × input).
    regionPricing: {
      us: { inputPricePerMTok: 0.08, outputPricePerMTok: 0.18, cacheReadPricePerMTok: 0.016 },
    },
    // Peak-hour surcharge staged, not live (see deepseek-v4-pro).
    scheduledPricing: {
      effectiveFrom: '2026-08-16T16:00:00Z',
      inputPricePerMTok: 0.22,
      outputPricePerMTok: 0.66,
      cacheReadPricePerMTok: 0.007,
      // DeepSeek charges no cache-write premium — write bills at input.
      cacheWritePricePerMTok: 0.22,
      peakPricing: {
        windows: [
          { startMinuteUtc: 60, endMinuteUtc: 240 },
          { startMinuteUtc: 360, endMinuteUtc: 600 },
        ],
        multiplier: 2,
      },
      source: 'https://api-docs.deepseek.com/quick_start/pricing/',
    },
    // Not published by DeepSeek — best-effort estimate.
    knowledgeCutoff: '2025-07-01',
  },

  // ---------------------------------------------------------------------------
  // Moonshot (Kimi)
  // Verified: https://platform.kimi.ai/docs/models +
  //           /docs/guide/use-kimi-k2-thinking-model (2026-07-28).
  // The moonshot bond now supports PRESERVED THINKING (ChatMessage.reasoning →
  // reasoning_content replay through tool loops), which unblocked the two
  // previously-excluded models: kimi-k3 (2026-07-16 flagship — 2.8T MoE, 1M
  // ctx, forced thinking, reasoning_effort low|high|max default max upstream)
  // and kimi-k2.7-code (coding flagship — forced thinking, no depth knob).
  // kimi-k2.x thinking stays on/off only; the bond disables it for those by
  // default (KIMI_REASONING_EFFORT env tunes it).
  // EVERY moonshot entry declares `regions` explicitly. A model that omits the
  // field defaults to `['us']` (effectiveModelRegion), which would route it to
  // the bare `moonshot` bond — DeepInfra when its key is set — with an id that
  // host has never heard of, i.e. a 404 at dispatch. The freshness gate's
  // region-re-host coverage check fails on exactly that (a us-region moonshot
  // model missing from the bond's modelMap).
  // ---------------------------------------------------------------------------
  {
    id: 'kimi-k3',
    provider: 'moonshot',
    label: 'Kimi K3',
    description: 'Moonshot flagship — 2.8T open weights, 1M context, multimodal',
    contextWindow: 1_000_000,
    // Max output not documented — conservative cap (matches the K2.x family).
    maxOutputTokens: 65_535,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    // Thinking is FORCED ON; depth rides reasoning_effort (low|high|max). The
    // upstream default is max — we default to high so agentic loops aren't
    // pinned to the slowest/most expensive tier unless the user asks for it.
    thinkingConfigurable: true,
    supportedEffortLevels: ['low', 'high', 'max'],
    defaultEffortLevel: 'high',
    // Text + image + video input.
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
    // Automatic context cache: absolute cache-hit price ($0.30/M = 0.1× input).
    cacheReadPricePerMTok: 0.3,
    cacheWritePricePerMTok: 3,
    // US default = DeepInfra, verified 2026-08-13 against
    // api.deepinfra.com/models/moonshotai/Kimi-K3: cents_per_input_token
    // 0.000285 → $2.85/MTok, cents_per_output_token 0.001425 → $14.25/MTok,
    // rate_per_input_token_cached 0.1 → cache read $0.285/MTok, and
    // rate_per_input_token_cache_write null → no write premium (the omitted
    // cache-write field falls back to the region's input rate). Cheaper than
    // Moonshot native on every axis, which is why US leads (see the
    // cheapest-default-region invariant in __tests__/lookup.test.ts).
    // The host serves the full 1M context, unquantized, and returns
    // reasoning_content while accepting reasoning_effort — probed live
    // 2026-08-13 — so the preserved-thinking tool loop works there unchanged.
    regions: ['us', 'cn'],
    regionPricing: {
      us: { inputPricePerMTok: 2.85, outputPricePerMTok: 14.25, cacheReadPricePerMTok: 0.285 },
    },
    // Not published — best-effort estimate.
    knowledgeCutoff: '2026-01-01',
  },
  {
    id: 'kimi-k2.7-code',
    provider: 'moonshot',
    label: 'Kimi K2.7 Code',
    description: 'Moonshot coding specialist — token-efficient agentic coding',
    contextWindow: 262_144,
    maxOutputTokens: 65_535,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    // Thinking forced on, NO depth knob (reasoning_effort unsupported here) —
    // the bond sends neither param and replays reasoning_content.
    thinkingConfigurable: false,
    // Coding model — vision not documented; conservative.
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.95,
    outputPricePerMTok: 4,
    // Automatic context cache: absolute cache-hit price ($0.19/M = 0.2× input).
    cacheReadPricePerMTok: 0.19,
    cacheWritePricePerMTok: 0.95,
    // US default (DeepInfra bills below native here). Re-verified 2026-08-13
    // against api.deepinfra.com/models/moonshotai/Kimi-K2.7-Code — the host
    // repriced since 2026-08-01 ($0.74/$3.50/$0.15): cents_per_input_token
    // 0.000068, cents_per_output_token 0.00034, rate_per_input_token_cached
    // 0.2 → cache read $0.136, no write premium.
    regions: ['us', 'cn'],
    regionPricing: {
      us: { inputPricePerMTok: 0.68, outputPricePerMTok: 3.4, cacheReadPricePerMTok: 0.136 },
    },
    // Not published — best-effort estimate.
    knowledgeCutoff: '2025-10-01',
    // kimi-k3 is the Moonshot pick, but this is NOT superseded: the coding
    // specialist is a distinct, much cheaper tier ($0.95/$4 vs $3/$15) with no
    // K3 equivalent, so it stays selectable under "Older models" — superseding
    // it would leave Moonshot with only the flagship.
    deprecatedAt: '2026-07-28',
  },
  {
    id: 'kimi-k2.6',
    provider: 'moonshot',
    label: 'Kimi K2.6',
    description: 'Multimodal agent — strong sequential tool use',
    contextWindow: 262_144,
    // Output shares the 256K context window (max_tokens default 32K upstream);
    // practical cap.
    maxOutputTokens: 65_535,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    // Thinking is on/off only (default on upstream; the bond disables it by
    // default for the executor loop — tune via KIMI_REASONING_EFFORT).
    thinkingConfigurable: false,
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // Native platform.kimi.ai pricing (the old $0.68/$3.41 was OpenRouter's
    // blended third-party rate).
    inputPricePerMTok: 0.95,
    outputPricePerMTok: 4,
    cacheReadPricePerMTok: 0.16,
    cacheWritePricePerMTok: 0.95,
    // US default (DeepInfra bills below native here). Verified 2026-08-01.
    regions: ['us', 'cn'],
    regionPricing: {
      us: { inputPricePerMTok: 0.75, outputPricePerMTok: 3.5, cacheReadPricePerMTok: 0.15 },
    },
    knowledgeCutoff: '2025-04-01',
    // Superseded by kimi-k3 (same general-purpose line) — kept priceable.
    deprecatedAt: '2026-07-28',
    supersededBy: 'kimi-k3',
  },
  {
    id: 'kimi-k2.5',
    provider: 'moonshot',
    label: 'Kimi K2.5',
    description: 'Older Kimi — strong sequential tool use',
    contextWindow: 262_144,
    maxOutputTokens: 65_535,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    // Thinking on/off only; no preserved-thinking support upstream.
    thinkingConfigurable: false,
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // Native platform.kimi.ai pricing.
    inputPricePerMTok: 0.6,
    outputPricePerMTok: 3,
    cacheReadPricePerMTok: 0.1,
    cacheWritePricePerMTok: 0.6,
    // US default (DeepInfra bills below native here). Verified 2026-08-01.
    regions: ['us', 'cn'],
    regionPricing: {
      us: { inputPricePerMTok: 0.45, outputPricePerMTok: 2.25, cacheReadPricePerMTok: 0.07 },
    },
    knowledgeCutoff: '2024-04-01',
    // Two generations behind. `supersededBy` names the current selectable Kimi
    // (k3) rather than the also-superseded k2.6, so a saved selection resolves
    // forward in one hop. Still served upstream; stays priceable.
    deprecatedAt: '2026-04-01',
    supersededBy: 'kimi-k3',
  },

  // ---------------------------------------------------------------------------
  // MiniMax
  // Verified: https://platform.minimax.io/docs/guides/models-intro
  //           https://platform.minimax.io/docs/guides/pricing-paygo.md
  // minimax-m3 (2026-06-01) is the flagship: 1M context (≥512K guaranteed),
  // multimodal (text+image+video in), thinking adaptive|disabled (no budget /
  // effort levels). Run non-thinking like the DeepSeek executors — with
  // thinking on, reasoning must be carried through tool loops. m2.7 thinking
  // CANNOT be disabled upstream.
  // ---------------------------------------------------------------------------
  {
    id: 'minimax-m3',
    provider: 'minimax',
    label: 'MiniMax M3',
    description: 'Agentic flagship — 1M context, multimodal, great value',
    contextWindow: 1_048_576,
    // Upstream recommends 128K max_tokens (hard max 512K).
    maxOutputTokens: 131_072,
    // Run non-thinking (the bond sends thinking:{type:"disabled"} for M3);
    // native control is adaptive|disabled only — no depth levels.
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // ≤512K-token prompts; >512K bills 2× (tiering not modeled).
    inputPricePerMTok: 0.3,
    outputPricePerMTok: 1.2,
    cacheReadPricePerMTok: 0.06,
    // M3 cache-write price not published — M2.7's rate (≥ input as required).
    cacheWritePricePerMTok: 0.375,
    // US default. DeepInfra list matches native; only the cache write differs
    // (no premium → region input rate). Verified 2026-08-01.
    regions: ['us', 'cn'],
    // The free tier PLANS with this model (molecule-dev FREE_TIER_MODELS.plan,
    // 2026-08-14), so its default US region must be free-tier selectable. It
    // took over from deepseek-v4-pro@cn: measured on the real starting-point
    // selection it scored 8/8 against Pro's 7/8 — including the case Pro failed
    // — at 1.28c/plan-turn flat versus Pro's 2.62c off-peak and 5.24c inside
    // DeepSeek's Beijing-hours windows, and it adds vision, which Pro (text
    // only) could not offer discovery. CN is NOT listed: it is dearer than US
    // here, so free planning stays on the cheaper host.
    freeTierRegions: ['us'],
    regionPricing: {
      // Verified 2026-08-14 against api.deepinfra.com/models/MiniMaxAI/MiniMax-M3
      // (cache read = 0.2 × input). Was 0.3/1.2/0.06 — DeepInfra had repriced
      // and nothing noticed, because the freshness gate's re-host check only
      // covered deepseek and moonshot until this date.
      us: { inputPricePerMTok: 0.28, outputPricePerMTok: 1.1, cacheReadPricePerMTok: 0.056 },
    },
    // From the official HF chat template ("Knowledge cutoff: January 2026").
    knowledgeCutoff: '2026-01-01',
  },
  {
    id: 'minimax-m2.7',
    provider: 'minimax',
    label: 'MiniMax M2.7',
    description: 'Agentic productivity — strong value for coding',
    contextWindow: 204_800,
    maxOutputTokens: 196_608,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    // Thinking is ALWAYS ON for M2.x (cannot be disabled) — no depth control.
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    // Native platform repriced (was $0.25/$1.00).
    inputPricePerMTok: 0.3,
    outputPricePerMTok: 1.2,
    cacheReadPricePerMTok: 0.06,
    cacheWritePricePerMTok: 0.375,
    // US default (DeepInfra still bills the pre-reprice rate). Verified
    // 2026-08-01.
    regions: ['us', 'cn'],
    regionPricing: {
      us: { inputPricePerMTok: 0.25, outputPricePerMTok: 1, cacheReadPricePerMTok: 0.05 },
    },
    knowledgeCutoff: '2025-09-01',
    // Superseded by minimax-m3 (same price, 1M ctx, multimodal) — kept priceable.
    deprecatedAt: '2026-07-28',
    supersededBy: 'minimax-m3',
  },
  {
    id: 'minimax-m2.5',
    provider: 'minimax',
    label: 'MiniMax M2.5',
    description: 'Older MiniMax — strong value for coding',
    contextWindow: 196_608,
    maxOutputTokens: 196_608,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    // Thinking always on for M2.x — no depth control.
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.3,
    outputPricePerMTok: 1.2,
    cacheReadPricePerMTok: 0.03,
    cacheWritePricePerMTok: 0.375,
    // No US re-host exists (not on DeepInfra) — pinned to native China.
    regions: ['cn'],
    knowledgeCutoff: '2025-01-01',
    // Superseded by minimax-m3 (legacy upstream, still served) — kept priceable.
    deprecatedAt: '2026-03-18',
    supersededBy: 'minimax-m3',
  },

  // ---------------------------------------------------------------------------
  // Alibaba (Qwen)
  // Verified: https://www.alibabacloud.com/help/en/model-studio/deep-thinking
  //           https://www.alibabacloud.com/help/en/model-studio/qwen-coder
  //           https://openrouter.ai/qwen/qwen3.7-max
  // qwen3.8-max (2026-08-03) is the agentic flagship, succeeding qwen3.7-max —
  // Alibaba's own Qwen-Coder docs now recommend the general-purpose models over
  // Qwen-Coder. Their thinking
  // uses enable_thinking (default ON for the 3.7 series) + thinking_budget
  // (token cap) — a real budget param, so effort scales the budget. The
  // qwen3-coder models are NON-thinking (previous catalog entry was wrong).
  // Prices are DashScope international list rates (the bond calls DashScope,
  // not OpenRouter; a 50%-off promo currently applies — billed at list).
  // ---------------------------------------------------------------------------
  // qwen3.8-max (GA 2026-08-03) succeeds qwen3.7-max as the agentic flagship,
  // priced BELOW it at $2/$6 (intl CNY 14.988/44.965, same fixed conversion).
  // Same hybrid thinking mechanism as the 3.7 series (enable_thinking default
  // ON + thinking_budget; preserve_thinking supported). Context cache uses the
  // standard implicit rates — see the Sources block for the ZH-doc citation.
  {
    id: 'qwen3.8-max',
    provider: 'alibaba',
    label: 'Qwen3.8 Max',
    description: 'Alibaba agentic flagship — 1M context, hybrid thinking',
    contextWindow: 1_000_000,
    // Alibaba's public pages don't state a max-output figure; models.dev says
    // 131,072 — kept at the 3.7-max figure until the provider publishes one
    // (understating only shortens completions; overstating would error).
    maxOutputTokens: 65_536,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['4K', '8K', '16K', '32K'],
    defaultEffortLevel: '8K',
    effortBudgetTokens: { '4K': 4000, '8K': 8000, '16K': 16000, '32K': 32000 },
    // models.dev claims image+video input, but Alibaba's own model catalog
    // lists qwen3.8-max under text generation (VL remains a separate line) —
    // false until the provider's page says otherwise.
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 2,
    outputPricePerMTok: 6,
    // Implicit context cache: read = 20% of input, no write premium.
    cacheReadPricePerMTok: 0.4,
    cacheWritePricePerMTok: 2,
    regions: ['us', 'cn'],
    // US = DeepInfra (Qwen/Qwen3.8-Max), verified 2026-08-14 against
    // api.deepinfra.com/models/ (cache read = 0.1248 x input). ABSENT until then:
    // every US turn was metered at Alibaba's native rates while running on
    // DeepInfra, and the model 404'd outright because the bond's modelMap had
    // never been updated past qwen3.7-max.
    regionPricing: {
      us: { inputPricePerMTok: 1.65, outputPricePerMTok: 4.951, cacheReadPricePerMTok: 0.206 },
    },
    // Not published by Alibaba — best-effort estimate.
    knowledgeCutoff: '2026-04-01',
  },
  {
    id: 'qwen3.7-max',
    provider: 'alibaba',
    label: 'Qwen3.7 Max',
    description: 'Alibaba agentic flagship — 1M context, hybrid thinking',
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    // enable_thinking + thinking_budget: a controllable token budget → effort
    // scales the budget (no native level names).
    thinkingConfigurable: true,
    supportedEffortLevels: ['4K', '8K', '16K', '32K'],
    defaultEffortLevel: '8K',
    effortBudgetTokens: { '4K': 4000, '8K': 8000, '16K': 16000, '32K': 32000 },
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 7.5,
    // Implicit context cache: read ≈0.2× input, no write premium.
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 2.5,
    // US default. DeepInfra bills identical rates (no regionPricing needed).
    // Verified 2026-08-01.
    regions: ['us', 'cn'],
    // US = DeepInfra, verified 2026-08-14 (cache read = 0.2 x input). Superseded,
    // but still priceable for historical usage, so its region rates must be real.
    regionPricing: {
      us: { inputPricePerMTok: 2.5, outputPricePerMTok: 7.5, cacheReadPricePerMTok: 0.5 },
    },
    // Not published by Alibaba — best-effort estimate.
    knowledgeCutoff: '2026-01-01',
    // Superseded by qwen3.8-max (GA 2026-08-03): same tier and mechanism, and
    // CHEAPER at list ($2/$6 vs $2.50/$7.50). Still served upstream (the 50%-off
    // promo runs on this id), so it stays priceable — it is just not offered.
    deprecatedAt: '2026-08-03',
    supersededBy: 'qwen3.8-max',
  },
  {
    id: 'qwen3-coder-plus',
    provider: 'alibaba',
    label: 'Qwen3 Coder Plus',
    description: 'Coding specialist — 1M context',
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    // Qwen3-Coder models support ONLY non-thinking mode (no thinking control
    // at all) — the previous "configurable thinking" entry was wrong.
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    // DashScope international list rate, flat across input tiers (the old
    // $0.65/$3.25 was OpenRouter's promo rate).
    inputPricePerMTok: 1,
    outputPricePerMTok: 5,
    // Implicit context cache: read 0.2× input, no write premium.
    cacheReadPricePerMTok: 0.2,
    cacheWritePricePerMTok: 1,
    // US default (DeepInfra bills well below native). Verified 2026-08-01.
    regions: ['us', 'cn'],
    regionPricing: {
      us: { inputPricePerMTok: 0.3, outputPricePerMTok: 1, cacheReadPricePerMTok: 0.1 },
    },
    knowledgeCutoff: '2025-06-01',
    // Alibaba itself recommends the general-purpose models over Qwen-Coder, so
    // this sits in "Older models" — but it is NOT superseded: it is a distinct
    // coding specialist and Alibaba's cheap tier (US $0.30/$1 vs qwen3.8-max's
    // $2/$6), with no newer coder id. Superseding it would leave Alibaba with
    // only the flagship.
    deprecatedAt: '2026-07-28',
  },

  // ---------------------------------------------------------------------------
  // Zhipu (GLM)
  // Verified: https://docs.z.ai/guides/overview/pricing
  //           https://docs.z.ai/api-reference/llm/chat-completion
  // glm-5.2 (standalone API since 2026-06-16) is the flagship. It is the ONLY
  // GLM model with reasoning_effort (values minimal|none|low|medium|high|
  // xhigh|max; low/medium coerce to high, xhigh coerces to max — effective
  // levels are high|max plus minimal/none = skip thinking; default max).
  // glm-5 has thinking on/off only and was REPRICED (was $0.72/$2.30).
  // ---------------------------------------------------------------------------
  {
    id: 'glm-5.2',
    provider: 'zhipu',
    label: 'GLM-5.2',
    description: 'Open-source SOTA agentic — 1M context',
    contextWindow: 1_048_576,
    maxOutputTokens: 131_072,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['minimal', 'high', 'max'],
    defaultEffortLevel: 'high',
    // Z.ai's default is max (= L, positioned for long-horizon coding); M =
    // high is the balanced tier; minimal (= S) skips thinking for fast turns.
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search',
    inputPricePerMTok: 1.4,
    outputPricePerMTok: 4.4,
    // GLM context cache: read ≈0.19× input, no write premium.
    cacheReadPricePerMTok: 0.26,
    cacheWritePricePerMTok: 1.4,
    // US default (DeepInfra bills ~half native). Verified 2026-08-01.
    regions: ['us', 'cn'],
    regionPricing: {
      us: { inputPricePerMTok: 0.75, outputPricePerMTok: 2.4, cacheReadPricePerMTok: 0.14 },
    },
    // Not published by Z.ai — best-effort estimate.
    knowledgeCutoff: '2025-06-01',
  },
  {
    id: 'glm-5',
    provider: 'zhipu',
    label: 'GLM-5',
    description: '77.8% SWE-bench — open-source agentic, 200K context',
    contextWindow: 202_752,
    maxOutputTokens: 131_072,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    // Thinking on/off only (reasoning_effort is glm-5.2-only) — no depth
    // control; defaults to enabled upstream.
    thinkingConfigurable: false,
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search',
    // Repriced by Z.ai around the GLM-5.1 launch (was $0.72/$2.30).
    inputPricePerMTok: 1,
    outputPricePerMTok: 3.2,
    // GLM context cache: read 0.2× input, no write premium.
    cacheReadPricePerMTok: 0.2,
    cacheWritePricePerMTok: 1,
    // US default (DeepInfra bills below native). Verified 2026-08-01.
    regions: ['us', 'cn'],
    regionPricing: {
      us: { inputPricePerMTok: 0.6, outputPricePerMTok: 2.08, cacheReadPricePerMTok: 0.12 },
    },
    knowledgeCutoff: '2025-01-01',
    // Superseded by glm-5.2 (same line, bigger window, reasoning_effort) — kept
    // priceable.
    deprecatedAt: '2026-07-28',
    supersededBy: 'glm-5.2',
  },
] as const
