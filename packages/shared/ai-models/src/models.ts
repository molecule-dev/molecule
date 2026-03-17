/**
 * Available AI models.
 *
 * This is the single source of truth for which models Synthase can use.
 * Both the backend whitelist and the frontend `/model` picker derive from this list.
 *
 * @module
 */

import type { AIProviderID, ModelDefinition } from './types.js'

/**
 * All available AI models, grouped by provider, ordered from most to least capable.
 *
 * To add or remove a model, edit this array. Both the API validation
 * and the IDE model picker will update automatically.
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
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search_20260209',
    codeExecutionToolType: 'code_execution_20250825',
    webFetchToolType: 'web_fetch_20260209',
    inputPricePerMTok: 5,
    outputPricePerMTok: 25,
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
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search_20260209',
    codeExecutionToolType: 'code_execution_20250825',
    webFetchToolType: 'web_fetch_20260209',
    inputPricePerMTok: 3,
    outputPricePerMTok: 15,
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
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search_20250305',
    webFetchToolType: 'web_fetch_20250910',
    inputPricePerMTok: 1,
    outputPricePerMTok: 5,
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
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    inputPricePerMTok: 2.5,
    outputPricePerMTok: 15,
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
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    webSearchToolType: 'google_search',
    codeExecutionToolType: 'code_execution',
    webFetchToolType: 'url_context',
    inputPricePerMTok: 2,
    outputPricePerMTok: 12,
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
    supportsVision: true,
    supportsPromptCaching: false,
    supportsTools: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    inputPricePerMTok: 2,
    outputPricePerMTok: 6,
    knowledgeCutoff: '2024-11-01',
  },
  {
    id: 'grok-4-1-fast-reasoning',
    provider: 'xai',
    label: 'Grok 4.1 Fast',
    description: 'Cheapest 2M context — $0.20/MTok input',
    contextWindow: 2_000_000,
    maxOutputTokens: 128_000,
    supportsThinking: true,
    thinkingBudgetTokens: 8_000,
    supportsVision: true,
    supportsPromptCaching: false,
    supportsTools: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    inputPricePerMTok: 0.2,
    outputPricePerMTok: 0.5,
    knowledgeCutoff: '2024-11-01',
  },
  {
    id: 'grok-code-fast-1',
    provider: 'xai',
    label: 'Grok Code',
    description: 'Code specialist — fast & cheap',
    contextWindow: 256_000,
    maxOutputTokens: 64_000,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    webSearchToolType: 'web_search',
    codeExecutionToolType: 'code_interpreter',
    inputPricePerMTok: 0.2,
    outputPricePerMTok: 1.5,
    knowledgeCutoff: '2024-11-01',
  },

  // ---------------------------------------------------------------------------
  // Meta (Llama) — open-source, hosted via Together AI / Fireworks / etc.
  // Verified: https://openrouter.ai/meta-llama/llama-4-maverick
  //           https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8
  //           https://openrouter.ai/meta-llama/llama-4-scout
  // Note: Scout model supports 10M context per Meta, but API providers
  //       currently limit to ~328K. Listed as 327,680 (provider reality).
  // ---------------------------------------------------------------------------
  {
    id: 'meta-llama/llama-4-maverick',
    provider: 'meta',
    label: 'Llama 4 Maverick',
    description: 'Open-source MoE — 1M context, very cheap',
    contextWindow: 1_048_576,
    maxOutputTokens: 16_384,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    supportsVision: true,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 0.15,
    outputPricePerMTok: 0.6,
    knowledgeCutoff: '2024-08-01',
  },
  {
    id: 'meta-llama/llama-4-scout',
    provider: 'meta',
    label: 'Llama 4 Scout',
    description: 'Open-source — 10M capable, cheapest option',
    contextWindow: 327_680,
    maxOutputTokens: 16_384,
    supportsThinking: false,
    thinkingBudgetTokens: 0,
    supportsVision: true,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 0.08,
    outputPricePerMTok: 0.3,
    knowledgeCutoff: '2024-08-01',
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
    supportsVision: true,
    supportsPromptCaching: true,
    supportsTools: true,
    inputPricePerMTok: 0.45,
    outputPricePerMTok: 2.2,
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
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 0.25,
    outputPricePerMTok: 1.2,
    knowledgeCutoff: '2025-01-01',
  },

  // ---------------------------------------------------------------------------
  // Alibaba (Qwen)
  // Verified: https://openrouter.ai/qwen/qwen3-coder-plus
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
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    inputPricePerMTok: 0.65,
    outputPricePerMTok: 3.25,
    knowledgeCutoff: '2025-06-01',
  },

  // ---------------------------------------------------------------------------
  // Zhipu (GLM)
  // Verified: https://openrouter.ai/z-ai/glm-5
  //           https://docs.z.ai/guides/llm/glm-5
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
    supportsVision: false,
    supportsPromptCaching: false,
    supportsTools: true,
    webSearchToolType: 'web_search',
    inputPricePerMTok: 0.72,
    outputPricePerMTok: 2.3,
    knowledgeCutoff: '2025-01-01',
  },
] as const

/** Set of valid model IDs for fast validation. */
export const MODEL_IDS: ReadonlySet<string> = new Set(MODELS.map((m) => m.id))

/**
 * Look up a model definition by ID.
 * @param id - The API model ID.
 * @returns The model definition, or undefined if not found.
 */
export function getModel(id: string): ModelDefinition | undefined {
  return MODELS.find((m) => m.id === id)
}

/**
 * Get all models for a specific provider.
 * @param provider - The provider ID.
 * @returns Array of model definitions for that provider.
 */
export function getModelsByProvider(provider: AIProviderID): readonly ModelDefinition[] {
  return MODELS.filter((m) => m.provider === provider)
}

/**
 * Get models that are currently usable — filtered to only providers that are available.
 *
 * The caller passes in which provider IDs are active (i.e., have a bond wired).
 * This keeps the shared package dependency-free — it doesn't import the bond system.
 *
 * @param availableProviders - Set or array of provider IDs that have active bonds.
 * @returns Models whose provider is in the available set.
 */
export function getAvailableModels(
  availableProviders: ReadonlySet<AIProviderID> | readonly AIProviderID[],
): readonly ModelDefinition[] {
  const providerSet =
    availableProviders instanceof Set ? availableProviders : new Set(availableProviders)
  return MODELS.filter((m) => providerSet.has(m.provider))
}

/**
 * Format a token count for display (e.g., 200000 -> "200K", 1000000 -> "1M").
 * @param tokens - Token count.
 * @returns Formatted string.
 */
export function formatTokenCount(tokens: number): string {
  if (tokens >= 1_000_000) {
    const m = tokens / 1_000_000
    return `${Number.isInteger(m) ? m : m.toFixed(1).replace(/\.0$/, '')}M`
  }
  if (tokens >= 1_000) {
    const k = tokens / 1_000
    return `${Number.isInteger(k) ? k : Math.round(k)}K`
  }
  return String(tokens)
}
