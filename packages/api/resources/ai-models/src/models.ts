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
 * `supportedEffortLevels` rule (see {@link ModelDefinition.supportedEffortLevels}):
 * a model with a fully controllable reasoning budget (`thinkingConfigurable:
 * true`) carries the full abstract scale `['S', 'M', 'L', 'XL']`; a model whose
 * reasoning is fixed (`thinkingConfigurable: false` — whether it thinks at a
 * fixed budget like `grok-code-fast-1` or does not think at all like the
 * DeepSeek executors) carries only the default level `['M']`. Every set
 * includes the default `'M'` so `DEFAULT_EFFORT_LEVEL` is always in range.
 * Omitting the field is still valid and means "all levels" — the catalog just
 * sets it explicitly on every entry so each model's effort capability is
 * self-evident and tunable.
 *
 * Sources (verified 2026-06-16):
 * - Anthropic: https://platform.claude.com/docs/en/about-claude/models/overview
 *   (claude-fable-5 + claude-opus-4-8 current; claude-opus-4-6 deprecated)
 * - OpenAI: https://developers.openai.com/api/docs/models/gpt-5.5
 *   (gpt-5.5 current; gpt-5.4 deprecated)
 * - Google: https://ai.google.dev/gemini-api/docs/models
 *   (gemini-3.1-pro GA, 2M context; gemini-3.1-pro-preview deprecated)
 * - xAI: https://docs.x.ai/developers/models
 *   (grok-4.3 current flagship; grok-4.20 deprecated; grok-code-fast-1 retired/disabled)
 * - DeepSeek: https://api-docs.deepseek.com/quick_start/pricing
 *   (deepseek-v4-pro / deepseek-v4-flash current — released 2026-04-24)
 * - Meta: https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8
 * - Moonshot: https://openrouter.ai/moonshotai/kimi-k2.6
 *   (kimi-k2.6 current; kimi-k2.5 deprecated)
 * - MiniMax: https://openrouter.ai/minimax/minimax-m2.7
 *   (minimax-m2.7 current; minimax-m2.5 deprecated)
 * - Alibaba: https://openrouter.ai/qwen/qwen3-coder-plus (current)
 * - Zhipu: https://openrouter.ai/z-ai/glm-5, https://docs.z.ai/guides/llm/glm-5
 *   (glm-5 current; glm-5.2 launched 2026-06-13 but its standalone API + per-token
 *   pricing are not yet published — Coding-Plan-only at launch — so not added yet)
 *
 * Knowledge-cutoff dates on the bumped non-Anthropic entries are best-effort
 * estimates; the provider sources above verify id / pricing / context window.
 */
export const MODELS: readonly ModelDefinition[] = [
  // ---------------------------------------------------------------------------
  // Anthropic
  // Verified: https://platform.claude.com/docs/en/about-claude/models/overview
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
    knowledgeCutoff: '2025-11-01',
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
    knowledgeCutoff: '2025-11-01',
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
    description: 'Fast & capable — best balance',
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    supportsThinking: true,
    thinkingBudgetTokens: 10_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
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
  //           https://developers.openai.com/api/docs/pricing/
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
    knowledgeCutoff: '2025-10-01',
  },
  {
    id: 'gpt-5.4',
    provider: 'openai',
    label: 'GPT-5.4',
    description: 'Previous OpenAI flagship — strong coding & tool use',
    contextWindow: 1_050_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
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
    // Superseded by gpt-5.5; kept selectable (Older models) + priceable.
    deprecatedAt: '2026-06-16',
  },

  // ---------------------------------------------------------------------------
  // Google
  // Verified: https://ai.google.dev/gemini-api/docs/models
  //           https://ai.google.dev/gemini-api/docs/pricing
  // Note: gemini-3.1-pro GA'd 2026-02-19 with a 2M context; pricing is $2/$12
  //       for prompts ≤200K, $4/$18 for >200K. The preview id is deprecated.
  // ---------------------------------------------------------------------------
  {
    id: 'gemini-3.1-pro',
    provider: 'google',
    label: 'Gemini 3.1 Pro',
    description: 'Google flagship — top benchmarks & 2M context',
    contextWindow: 2_000_000,
    maxOutputTokens: 16_384,
    supportsThinking: true,
    thinkingBudgetTokens: 10_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'google_search',
    codeExecutionToolType: 'code_execution',
    webFetchToolType: 'url_context',
    inputPricePerMTok: 2,
    outputPricePerMTok: 12,
    // Gemini context cache: read at a discount (≈0.25× input), no write premium.
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 2,
    knowledgeCutoff: '2025-01-01',
  },
  {
    id: 'gemini-3.1-pro-preview',
    provider: 'google',
    label: 'Gemini 3.1 Pro (preview)',
    description: 'Preview of Gemini 3.1 Pro — superseded by the GA release',
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsThinking: true,
    thinkingBudgetTokens: 10_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'google_search',
    codeExecutionToolType: 'code_execution',
    webFetchToolType: 'url_context',
    inputPricePerMTok: 2,
    outputPricePerMTok: 12,
    // Gemini context cache: read at a discount (≈0.25× input), no write premium.
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 2,
    knowledgeCutoff: '2025-01-01',
    // Superseded by the GA gemini-3.1-pro; kept selectable (Older models) + priceable.
    deprecatedAt: '2026-02-19',
  },

  // ---------------------------------------------------------------------------
  // xAI (Grok)
  // Verified: https://docs.x.ai/developers/models
  // Note: max output tokens not specified in xAI docs for any model. grok-4.3
  //       (launched 2026-04-30) is the current flagship; grok-4.20 is now an
  //       older alias; grok-code-fast-1 is retired/disabled (see below).
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
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 1.25,
    outputPricePerMTok: 2.5,
    // xAI cached input billed at a flat $0.20/M, no write premium.
    cacheReadPricePerMTok: 0.2,
    cacheWritePricePerMTok: 1.25,
    knowledgeCutoff: '2025-06-01',
  },
  {
    id: 'grok-4.20-multi-agent-beta-0309',
    provider: 'xai',
    label: 'Grok 4.20',
    description: 'Older xAI flagship — 2M context, multi-agent',
    contextWindow: 2_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 16_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 2,
    outputPricePerMTok: 6,
    // xAI cached input billed at a discount (≈0.25× input), no write premium.
    cacheReadPricePerMTok: 0.5,
    cacheWritePricePerMTok: 2,
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
    // Retired/deprecated by xAI — disabled: removed from selection + the public
    // listing, but getModel() still prices any historical usage. NEVER delete.
    disabled: true,
  },

  // ---------------------------------------------------------------------------
  // DeepSeek
  // Verified: https://api-docs.deepseek.com/quick_start/pricing
  //           https://api-docs.deepseek.com/news/news260424 (V4 preview)
  // OpenAI/Anthropic-compatible API; text/code only (no vision); 1M context,
  // 3 reasoning-effort modes, automatic context (prompt) caching.
  // ---------------------------------------------------------------------------
  {
    id: 'deepseek-v4-pro',
    provider: 'deepseek',
    label: 'DeepSeek V4 Pro',
    description: 'Frontier-class — rivals top models at low cost',
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    // Run non-thinking: DeepSeek V4 thinking mode requires reasoning_content to be
    // echoed back across turns and is awkward with the tool-calling loop. Synthase
    // uses Sonnet as the planner, so DeepSeek serves as a non-thinking executor.
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    thinkingConfigurable: false,
    supportedEffortLevels: ['M'],
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 1.74,
    outputPricePerMTok: 3.48,
    // DeepSeek automatic context cache: cache-hit reads at 0.1× input, no write premium.
    cacheReadPricePerMTok: 0.174,
    cacheWritePricePerMTok: 1.74,
    knowledgeCutoff: '2025-07-01',
  },
  {
    id: 'deepseek-v4-flash',
    provider: 'deepseek',
    label: 'DeepSeek V4 Flash',
    description: 'Ultra-cheap & fast — economical agentic coding',
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    // Non-thinking (see deepseek-v4-pro note) — also the right tradeoff for a
    // cheap, fast tool-calling executor.
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
    // DeepSeek automatic context cache: cache-hit reads at 0.1× input, no write premium.
    cacheReadPricePerMTok: 0.014,
    cacheWritePricePerMTok: 0.14,
    knowledgeCutoff: '2025-07-01',
  },

  // ---------------------------------------------------------------------------
  // Moonshot (Kimi)
  // Verified: https://openrouter.ai/moonshotai/kimi-k2.6
  //           kimi-k2.6 (released 2026-04) is the current general flagship;
  //           kimi-k2.5 is superseded.
  // ---------------------------------------------------------------------------
  {
    id: 'kimi-k2.6',
    provider: 'moonshot',
    label: 'Kimi K2.6',
    description: 'Multimodal agent — strong sequential tool use',
    contextWindow: 262_144,
    maxOutputTokens: 65_535,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.68,
    outputPricePerMTok: 3.41,
    // Cached input billed at a discount (≈0.25× input), no write premium.
    cacheReadPricePerMTok: 0.17,
    cacheWritePricePerMTok: 0.68,
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
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.45,
    outputPricePerMTok: 2.2,
    // Cached input billed at a discount (≈0.25× input), no write premium.
    cacheReadPricePerMTok: 0.1125,
    cacheWritePricePerMTok: 0.45,
    knowledgeCutoff: '2024-04-01',
    // Superseded by kimi-k2.6; kept selectable (Older models) + priceable.
    deprecatedAt: '2026-04-01',
  },

  // ---------------------------------------------------------------------------
  // MiniMax
  // Verified: https://openrouter.ai/minimax/minimax-m2.7
  //           minimax-m2.7 (released 2026-03-18) is the current flagship;
  //           minimax-m2.5 is superseded.
  // ---------------------------------------------------------------------------
  {
    id: 'minimax-m2.7',
    provider: 'minimax',
    label: 'MiniMax M2.7',
    description: 'Agentic productivity — strong value for coding',
    contextWindow: 204_800,
    maxOutputTokens: 196_608,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.25,
    outputPricePerMTok: 1,
    // Cached input billed at a discount (≈0.25× input), no write premium.
    cacheReadPricePerMTok: 0.0625,
    cacheWritePricePerMTok: 0.25,
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
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.25,
    outputPricePerMTok: 1.2,
    // Cached input billed at a discount (≈0.25× input), no write premium.
    cacheReadPricePerMTok: 0.0625,
    cacheWritePricePerMTok: 0.25,
    knowledgeCutoff: '2025-01-01',
    // Superseded by minimax-m2.7; kept selectable (Older models) + priceable.
    deprecatedAt: '2026-03-18',
  },

  // ---------------------------------------------------------------------------
  // Alibaba (Qwen)
  // Verified: https://openrouter.ai/qwen/qwen3-coder-plus
  //           https://modelstudio.console.alibabacloud.com
  // ---------------------------------------------------------------------------
  {
    id: 'qwen3-coder-plus',
    provider: 'alibaba',
    label: 'Qwen3 Coder Plus',
    description: 'Coding specialist — 1M context, very cheap',
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.65,
    outputPricePerMTok: 3.25,
    // Cached input billed at a discount (≈0.25× input), no write premium.
    cacheReadPricePerMTok: 0.1625,
    cacheWritePricePerMTok: 0.65,
    knowledgeCutoff: '2025-06-01',
  },

  // ---------------------------------------------------------------------------
  // Zhipu (GLM)
  // Verified: https://openrouter.ai/z-ai/glm-5
  //           https://docs.z.ai/guides/llm/glm-5
  //           https://docs.z.ai/guides/capabilities/cache
  // ---------------------------------------------------------------------------
  {
    id: 'glm-5',
    provider: 'zhipu',
    label: 'GLM-5',
    description: '77.8% SWE-bench — open-source SOTA agentic',
    contextWindow: 202_752,
    maxOutputTokens: 131_072,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    thinkingConfigurable: true,
    supportedEffortLevels: ['S', 'M', 'L', 'XL'],
    supportsVision: false,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search',
    inputPricePerMTok: 0.72,
    outputPricePerMTok: 2.3,
    // GLM context cache (docs.z.ai/guides/capabilities/cache): read ≈0.2× input, no write premium.
    cacheReadPricePerMTok: 0.144,
    cacheWritePricePerMTok: 0.72,
    knowledgeCutoff: '2025-01-01',
  },
] as const
