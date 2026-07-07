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
 * `supportedEffortLevels` + `effortNativeByLevel` rules (see
 * {@link ModelDefinition.effortNativeByLevel}):
 * - A model driven by a provider-native effort/level param carries an
 *   `effortNativeByLevel` map (monotone on the provider's scale) and
 *   `supportedEffortLevels` = exactly the map's keys. Convention: `M` maps to
 *   the provider's default/recommended level for agentic coding on that model.
 * - A model with a controllable token budget but no native levels (e.g. Claude
 *   Haiku 4.5's `budget_tokens`, Qwen's `thinking_budget`) carries the full
 *   `['S', 'M', 'L', 'XL']` scale and NO map — effort scales
 *   `thinkingBudgetTokens`.
 * - A model whose reasoning is fixed (always-on or on/off only, no depth
 *   control) carries `thinkingConfigurable: false` + `['M']` — effort then only
 *   scales the agent-loop budget.
 * Every set includes the default `'M'` so `DEFAULT_EFFORT_LEVEL` is always in
 * range.
 *
 * Sources (verified 2026-07-07):
 * - Anthropic: https://platform.claude.com/docs/en/about-claude/models/overview
 *   + /docs/en/build-with-claude/effort (fable-5 / opus-4-8 / sonnet-5 current;
 *   sonnet-4-6 + opus-4-6 legacy; effort = output_config.effort, adaptive
 *   thinking; budget_tokens 400s on fable-5/opus-4-8/sonnet-5)
 * - OpenAI: https://developers.openai.com/api/docs/models/gpt-5.5 + /pricing +
 *   /guides/reasoning (gpt-5.5 flagship; gpt-5.4 NOT deprecated; gpt-5.4-mini
 *   cheap tier; reasoning_effort none|low|medium|high|xhigh. GPT-5.6 “Sol” is
 *   limited-preview only — no public id/pricing yet; do not add until GA.)
 * - Google: https://ai.google.dev/gemini-api/docs/models + /docs/thinking
 *   (gemini-3.5-flash GA 2026-05-19 is the agentic/coding flagship;
 *   gemini-3.1-pro-preview is the pro tier — there is NO bare "gemini-3.1-pro"
 *   id and never was; thinking_level replaces thinking_budget)
 * - xAI: https://docs.x.ai/developers/models + /model-capabilities/text/reasoning
 *   (grok-4.3 flagship, reasoning_effort none|low|medium|high default low;
 *   grok-build-0.1 succeeds grok-code-fast-1, which retires 2026-08-15)
 * - DeepSeek: https://api-docs.deepseek.com/quick_start/pricing +
 *   /guides/thinking_mode (V4 permanent 75% price cut since 2026-05-23; 384K
 *   output; thinking default ENABLED w/ reasoning_effort high|max — we still
 *   run non-thinking, see entries. Peak-hour 2× pricing announced for
 *   mid-Jul 2026; re-verify pricing when the "V4 official" release lands.)
 * - Moonshot: https://platform.kimi.ai/docs/models (kimi-k2.6 = current
 *   general flagship; kimi-k2.7-code exists but REQUIRES replaying
 *   reasoning_content through tool loops — not added until the bond supports
 *   preserved thinking; kimi-k2.5 legacy but still served)
 * - MiniMax: https://platform.minimax.io/docs/guides/models-intro +
 *   /docs/guides/pricing-paygo.md (minimax-m3 flagship 2026-06-01, 1M ctx,
 *   multimodal; m2.7 repriced $0.30/$1.20, thinking not disableable)
 * - Alibaba: https://www.alibabacloud.com/help/en/model-studio/deep-thinking +
 *   /model-studio/qwen-coder (qwen3.7-max is the agentic flagship — Alibaba now
 *   recommends general-purpose models over Qwen-Coder; qwen3-coder-plus is
 *   NON-thinking, catalog previously wrong)
 * - Zhipu: https://docs.z.ai/guides/overview/pricing +
 *   /api-reference/llm/chat-completion (glm-5.2 standalone API live since
 *   2026-06-16 w/ reasoning_effort — effective levels high|max, default max;
 *   glm-5 repriced $1.00/$3.20)
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
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    // Thinking is ALWAYS ON (adaptive); effort is the only depth control.
    // Anthropic: default/recommended is high (M); xhigh for the most
    // capability-sensitive work; low still performs well on routine tasks.
    effortNativeByLevel: { S: 'low', M: 'high', L: 'xhigh', XL: 'max' },
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
    id: 'claude-opus-4-8',
    provider: 'anthropic',
    label: 'Claude Opus 4.8',
    description: 'Highly capable Opus — deep reasoning & complex agentic work',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    // Anthropic's rec for coding/agentic on Opus 4.8 is xhigh (= L here); the
    // API default high (= M) is the balanced quality/cost sweet spot.
    effortNativeByLevel: { S: 'low', M: 'high', L: 'xhigh', XL: 'max' },
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
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    // Adaptive thinking on by default; effort default/rec is high (M), xhigh
    // (L) for the hardest coding/agentic tasks, medium ≈ Sonnet 4.6 at high.
    effortNativeByLevel: { S: 'low', M: 'high', L: 'xhigh', XL: 'max' },
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
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    label: 'Claude Opus 4.6',
    description: 'Previous-generation Opus — deep reasoning & complex tasks',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    // No xhigh on the 4.6 family; budget_tokens still accepted but deprecated —
    // adaptive + effort is the recommended control.
    effortNativeByLevel: { S: 'low', M: 'medium', L: 'high', XL: 'max' },
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
    // Superseded by claude-opus-4-8; kept selectable (Older models) + priceable.
    deprecatedAt: '2026-06-16',
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
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    // No xhigh on the 4.6 family. Anthropic's recommended default for agentic
    // coding on Sonnet 4.6 is medium (= M); high is its API default (= L).
    effortNativeByLevel: { S: 'low', M: 'medium', L: 'high', XL: 'max' },
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
    // Superseded by claude-sonnet-5; kept selectable (Older models) + priceable.
    deprecatedAt: '2026-07-07',
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
    // thinking — it keeps the legacy budget_tokens path, so effort scales the
    // token budget (no effortNativeByLevel).
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
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
  // Verified: https://developers.openai.com/api/docs/models/gpt-5.5
  //           https://developers.openai.com/api/docs/pricing
  //           https://developers.openai.com/api/docs/guides/reasoning
  // reasoning_effort values: none | low | medium | high | xhigh (default medium
  // on gpt-5.5, none on gpt-5.4/gpt-5.4-mini). OpenAI recommends medium as the
  // agentic-coding starting point. GPT-5.6 (Sol/Terra/Luna) is limited-preview
  // only — no public ids — do not add until GA.
  // ---------------------------------------------------------------------------
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
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    // OpenAI default + agentic-coding rec is medium (= M); 'none' is not
    // offered (it disables reasoning outright).
    effortNativeByLevel: { S: 'low', M: 'medium', L: 'high', XL: 'xhigh' },
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    inputPricePerMTok: 5,
    outputPricePerMTok: 30,
    // OpenAI auto-caches at no write premium; cached input billed at 0.1× input.
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 5,
    knowledgeCutoff: '2025-12-01',
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
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    effortNativeByLevel: { S: 'low', M: 'medium', L: 'high', XL: 'xhigh' },
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 15,
    // OpenAI auto-caches at no write premium; cached input billed at 0.1× input.
    cacheReadPricePerMTok: 0.25,
    cacheWritePricePerMTok: 2.5,
    knowledgeCutoff: '2025-08-31',
    // NOT deprecated (previous "deprecatedAt: 2026-06-16" was wrong — OpenAI's
    // deprecations page lists gpt-5.4 as current; only ChatGPT dropped GPT-5.2).
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
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    effortNativeByLevel: { S: 'low', M: 'medium', L: 'high', XL: 'xhigh' },
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    inputPricePerMTok: 0.75,
    outputPricePerMTok: 4.5,
    // OpenAI auto-caches at no write premium; cached input billed at 0.1× input.
    cacheReadPricePerMTok: 0.075,
    cacheWritePricePerMTok: 0.75,
    knowledgeCutoff: '2025-08-31',
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
    id: 'gemini-3.5-flash',
    provider: 'google',
    label: 'Gemini 3.5 Flash',
    description: 'Google agentic/coding flagship — fast, 1M context',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsThinking: true,
    thinkingBudgetTokens: 10_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L'],
    // thinking_level: default medium (= M); Google recommends high (= L) for
    // advanced coding/multi-step planning. 'minimal' exists below low; no
    // fourth upward tier, so XL is not offered.
    effortNativeByLevel: { S: 'low', M: 'medium', L: 'high' },
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
    supportedEffortLevels: ['S', 'M', 'L'],
    // thinking_level: low|medium|high only (no minimal). Google's API default
    // for this model is high (= L); M offers the cost step-down.
    effortNativeByLevel: { S: 'low', M: 'medium', L: 'high' },
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
  },

  // ---------------------------------------------------------------------------
  // xAI (Grok)
  // Verified: https://docs.x.ai/developers/models
  //           https://docs.x.ai/developers/model-capabilities/text/reasoning
  // grok-4.3 accepts reasoning_effort: none | low | medium | high (default
  // low — a reversal from grok-4, which had no knob). Max output tokens are
  // still not documented by xAI for any model.
  // ---------------------------------------------------------------------------
  {
    id: 'grok-4.3',
    provider: 'xai',
    label: 'Grok 4.3',
    description: 'xAI flagship — fast reasoning, 1M context',
    contextWindow: 1_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    // xAI's default (and its own retirement-routing choice for agentic
    // workloads) is low (= M); none (= S) disables reasoning for a true fast
    // mode; step up for hard debugging/architecture turns.
    effortNativeByLevel: { S: 'none', M: 'low', L: 'medium', XL: 'high' },
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 2.5,
    // xAI cached input billed at a flat $0.20/M, no write premium.
    cacheReadPricePerMTok: 0.2,
    cacheWritePricePerMTok: 1.25,
    knowledgeCutoff: '2025-12-01',
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
    supportedEffortLevels: ['M'],
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
    supportedEffortLevels: ['M'],
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
    // Superseded by grok-4.3; kept selectable (Older models) + priceable.
    deprecatedAt: '2026-04-30',
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
    supportedEffortLevels: ['M'],
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
  // OpenAI/Anthropic-compatible API; text/code only (no vision); 1M context,
  // 384K max output, automatic context (prompt) caching with ABSOLUTE cache-hit
  // prices (~1/50–1/120 of miss — not the old 0.1× rule). Launch discount made
  // PERMANENT 2026-05-23 (Pro $1.74/$3.48 → $0.435/$0.87). Peak-hour 2×
  // pricing announced for the mid-Jul 2026 "V4 official" release — re-verify
  // then. Thinking now defaults ENABLED upstream and supports tool calling
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
    supportedEffortLevels: ['M'],
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.435,
    outputPricePerMTok: 0.87,
    // DeepSeek automatic context cache: absolute cache-hit price ($/M).
    cacheReadPricePerMTok: 0.003625,
    cacheWritePricePerMTok: 0.435,
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
    supportedEffortLevels: ['M'],
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
    // Not published by DeepSeek — best-effort estimate.
    knowledgeCutoff: '2025-07-01',
  },

  // ---------------------------------------------------------------------------
  // Moonshot (Kimi)
  // Verified: https://platform.kimi.ai/docs/models (platform.moonshot.ai now
  //           redirects here) + per-model pricing pages.
  // Native reasoning control is thinking:{type:"enabled"|"disabled"} only — no
  // documented reasoning_effort / budget, so kimi entries are fixed-effort
  // ['M']. kimi-k2.7-code (the new coding flagship, 2026-06-12) is NOT added
  // yet: it forces always-on thinking AND requires replaying reasoning_content
  // through multi-step tool calls (hard 400 on omission) — add it once the
  // moonshot bond supports preserved thinking.
  // ---------------------------------------------------------------------------
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
    supportedEffortLevels: ['M'],
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // Native platform.kimi.ai pricing (the old $0.68/$3.41 was OpenRouter's
    // blended third-party rate).
    inputPricePerMTok: 0.95,
    outputPricePerMTok: 4,
    cacheReadPricePerMTok: 0.16,
    cacheWritePricePerMTok: 0.95,
    knowledgeCutoff: '2025-04-01',
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
    supportedEffortLevels: ['M'],
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // Native platform.kimi.ai pricing.
    inputPricePerMTok: 0.6,
    outputPricePerMTok: 3,
    cacheReadPricePerMTok: 0.1,
    cacheWritePricePerMTok: 0.6,
    knowledgeCutoff: '2024-04-01',
    // Superseded by kimi-k2.6 (still served upstream, no announced retirement);
    // kept selectable (Older models) + priceable.
    deprecatedAt: '2026-04-01',
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
    supportedEffortLevels: ['M'],
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    // ≤512K-token prompts; >512K bills 2× (tiering not modeled).
    inputPricePerMTok: 0.3,
    outputPricePerMTok: 1.2,
    cacheReadPricePerMTok: 0.06,
    // M3 cache-write price not published — M2.7's rate (≥ input as required).
    cacheWritePricePerMTok: 0.375,
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
    supportedEffortLevels: ['M'],
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    // Native platform repriced (was $0.25/$1.00).
    inputPricePerMTok: 0.3,
    outputPricePerMTok: 1.2,
    cacheReadPricePerMTok: 0.06,
    cacheWritePricePerMTok: 0.375,
    knowledgeCutoff: '2025-09-01',
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
    supportedEffortLevels: ['M'],
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.3,
    outputPricePerMTok: 1.2,
    cacheReadPricePerMTok: 0.03,
    cacheWritePricePerMTok: 0.375,
    knowledgeCutoff: '2025-01-01',
    // Superseded by minimax-m3 (legacy upstream, still served); kept selectable
    // (Older models) + priceable.
    deprecatedAt: '2026-03-18',
  },

  // ---------------------------------------------------------------------------
  // Alibaba (Qwen)
  // Verified: https://www.alibabacloud.com/help/en/model-studio/deep-thinking
  //           https://www.alibabacloud.com/help/en/model-studio/qwen-coder
  //           https://openrouter.ai/qwen/qwen3.7-max
  // qwen3.7-max (2026-05-21) is the agentic flagship — Alibaba's own Qwen-Coder
  // docs now recommend the general-purpose models over Qwen-Coder. Its thinking
  // uses enable_thinking (default ON for the 3.7 series) + thinking_budget
  // (token cap) — a real budget param, so effort scales the budget. The
  // qwen3-coder models are NON-thinking (previous catalog entry was wrong).
  // Prices are DashScope international list rates (the bond calls DashScope,
  // not OpenRouter; a 50%-off promo currently applies — billed at list).
  // ---------------------------------------------------------------------------
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
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 7.5,
    // Implicit context cache: read ≈0.2× input, no write premium.
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 2.5,
    // Not published by Alibaba — best-effort estimate.
    knowledgeCutoff: '2026-01-01',
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
    supportedEffortLevels: ['M'],
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
    knowledgeCutoff: '2025-06-01',
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
    supportedEffortLevels: ['S', 'M', 'L'],
    // Z.ai's default is max (= L, positioned for long-horizon coding); M =
    // high is the balanced tier; minimal (= S) skips thinking for fast turns.
    effortNativeByLevel: { S: 'minimal', M: 'high', L: 'max' },
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search',
    inputPricePerMTok: 1.4,
    outputPricePerMTok: 4.4,
    // GLM context cache: read ≈0.19× input, no write premium.
    cacheReadPricePerMTok: 0.26,
    cacheWritePricePerMTok: 1.4,
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
    supportedEffortLevels: ['M'],
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
    knowledgeCutoff: '2025-01-01',
  },
] as const
