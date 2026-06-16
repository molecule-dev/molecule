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
 * Sources (verified 2026-03-16):
 * - Anthropic: https://platform.claude.com/docs/en/docs/about-claude/models/all-models
 * - OpenAI: https://developers.openai.com/api/docs/models/gpt-5.4
 * - Google: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview
 * - xAI: https://docs.x.ai/developers/models
 * - Meta: https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8
 * - Moonshot: https://openrouter.ai/moonshotai/kimi-k2.5
 * - MiniMax: https://openrouter.ai/minimax/minimax-m2.5
 * - Alibaba: https://openrouter.ai/qwen/qwen3-coder-plus
 * - Zhipu: https://openrouter.ai/z-ai/glm-5, https://docs.z.ai/guides/llm/glm-5
 */
export const MODELS: readonly ModelDefinition[] = [
  // ---------------------------------------------------------------------------
  // Anthropic
  // Verified: https://platform.claude.com/docs/en/docs/about-claude/models/all-models
  // ---------------------------------------------------------------------------
  {
    id: 'claude-opus-4-6',
    provider: 'anthropic',
    label: 'Claude Opus 4.6',
    description: 'Most capable — deep reasoning & complex tasks',
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
  // Verified: https://developers.openai.com/api/docs/models/gpt-5.4
  //           https://developers.openai.com/api/docs/pricing/
  // ---------------------------------------------------------------------------
  {
    id: 'gpt-5.4',
    provider: 'openai',
    label: 'GPT-5.4',
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
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 15,
    // OpenAI auto-caches at no write premium; cached input billed at 0.1× input.
    cacheReadPricePerMTok: 0.25,
    cacheWritePricePerMTok: 2.5,
    knowledgeCutoff: '2025-08-31',
  },

  // ---------------------------------------------------------------------------
  // Google
  // Verified: https://ai.google.dev/gemini-api/docs/models/gemini-3.1-pro-preview
  //           https://ai.google.dev/gemini-api/docs/pricing
  // Note: pricing is $2/$12 for prompts ≤200K, $4/$18 for >200K
  // ---------------------------------------------------------------------------
  {
    id: 'gemini-3.1-pro-preview',
    provider: 'google',
    label: 'Gemini 3.1 Pro',
    description: 'Google flagship — top benchmarks & 1M context',
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
  },

  // ---------------------------------------------------------------------------
  // xAI (Grok)
  // Verified: https://docs.x.ai/developers/models
  // Note: max output tokens not specified in xAI docs for any model
  // ---------------------------------------------------------------------------
  {
    id: 'grok-4.20-multi-agent-beta-0309',
    provider: 'xai',
    label: 'Grok 4.20',
    description: 'xAI flagship — 2M context, multi-agent',
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
    freeTier: true,
    inputPricePerMTok: 0.2,
    outputPricePerMTok: 1.5,
    // xAI cached input billed at a discount (≈0.25× input), no write premium.
    cacheReadPricePerMTok: 0.05,
    cacheWritePricePerMTok: 0.2,
    knowledgeCutoff: '2024-11-01',
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
    inputPricePerMTok: 0.14,
    outputPricePerMTok: 0.28,
    // DeepSeek automatic context cache: cache-hit reads at 0.1× input, no write premium.
    cacheReadPricePerMTok: 0.014,
    cacheWritePricePerMTok: 0.14,
    knowledgeCutoff: '2025-07-01',
  },

  // ---------------------------------------------------------------------------
  // Moonshot (Kimi)
  // Verified: https://openrouter.ai/moonshotai/kimi-k2.5
  // ---------------------------------------------------------------------------
  {
    id: 'kimi-k2.5',
    provider: 'moonshot',
    label: 'Kimi K2.5',
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
    inputPricePerMTok: 0.45,
    outputPricePerMTok: 2.2,
    // Cached input billed at a discount (≈0.25× input), no write premium.
    cacheReadPricePerMTok: 0.1125,
    cacheWritePricePerMTok: 0.45,
    knowledgeCutoff: '2024-04-01',
  },

  // ---------------------------------------------------------------------------
  // MiniMax
  // Verified: https://openrouter.ai/minimax/minimax-m2.5
  // ---------------------------------------------------------------------------
  {
    id: 'minimax-m2.5',
    provider: 'minimax',
    label: 'MiniMax M2.5',
    description: '80.2% SWE-bench — best value for coding',
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
