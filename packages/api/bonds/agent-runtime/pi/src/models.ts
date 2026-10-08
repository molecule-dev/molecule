/**
 * Catalog model ids → Pi's own `provider/id`, and how each Pi provider is reached.
 *
 * Pi's `--model` does FUZZY matching, so a bare id can silently select a
 * different model. The runtime therefore always passes a fully qualified
 * `provider/id`, resolved here, and refuses a bare id it cannot map.
 *
 * Verified 2026-10-03 against `@earendil-works/pi-coding-agent@1.0.0`
 * (`pi --list-models` with `--offline`, i.e. the catalog bundled in the CLI,
 * and each provider's `baseUrl` in the bundle).
 *
 * @module
 */

import type { PiProviderAccess } from './types.js'

/**
 * Pi providers the runtime knows how to credential and allowlist. Keys are
 * Pi's provider names (the part before `/` in a model id).
 */
export const PI_PROVIDERS: Readonly<Record<string, PiProviderAccess>> = {
  anthropic: { keyEnv: 'ANTHROPIC_API_KEY', host: 'api.anthropic.com' },
  openai: { keyEnv: 'OPENAI_API_KEY', host: 'api.openai.com' },
  google: { keyEnv: 'GEMINI_API_KEY', host: 'generativelanguage.googleapis.com' },
  xai: { keyEnv: 'XAI_API_KEY', host: 'api.x.ai' },
  deepseek: { keyEnv: 'DEEPSEEK_API_KEY', host: 'api.deepseek.com' },
  moonshotai: { keyEnv: 'MOONSHOT_API_KEY', host: 'api.moonshot.ai' },
  minimax: { keyEnv: 'MINIMAX_API_KEY', host: 'api.minimax.io' },
  openrouter: { keyEnv: 'OPENROUTER_API_KEY', host: 'openrouter.ai' },
}

/**
 * molecule catalog model id → Pi `provider/id`, for every catalog model Pi
 * 1.0.0 serves on the provider's own pay-as-you-go API. Catalog models absent
 * here (e.g. Qwen, GLM — Pi reaches those only through coding/token plans)
 * must be passed as a fully qualified Pi id or added via `modelMap`.
 */
export const DEFAULT_MODEL_MAP: Readonly<Record<string, string>> = {
  'claude-fable-5-1': 'anthropic/claude-fable-5-1',
  'claude-fable-5': 'anthropic/claude-fable-5',
  'claude-opus-5-5': 'anthropic/claude-opus-5-5',
  'claude-opus-5': 'anthropic/claude-opus-5',
  'claude-opus-4-8': 'anthropic/claude-opus-4-8',
  'claude-sonnet-5-5': 'anthropic/claude-sonnet-5-5',
  'claude-sonnet-5': 'anthropic/claude-sonnet-5',
  'claude-opus-4-7': 'anthropic/claude-opus-4-7',
  'claude-opus-4-6': 'anthropic/claude-opus-4-6',
  'claude-sonnet-4-6': 'anthropic/claude-sonnet-4-6',
  // Released after pi 1.0.0's bundled catalog (above); a passthrough row —
  // same anthropic provider/host as the rest of this family, so the runtime
  // can resolve the id without Pi fuzzy-matching a bare string.
  'claude-haiku-5-5': 'anthropic/claude-haiku-5-5',
  'claude-haiku-4-5-20251001': 'anthropic/claude-haiku-4-5-20251001',
  'gpt-6-astra': 'openai/gpt-6-astra',
  'gpt-6.1-sol': 'openai/gpt-6.1-sol',
  'gpt-6-sol': 'openai/gpt-6-sol',
  'gpt-6-luna': 'openai/gpt-6-luna',
  'gpt-5.6-sol': 'openai/gpt-5.6-sol',
  'gpt-5.6-terra': 'openai/gpt-5.6-terra',
  'gpt-5.6-luna': 'openai/gpt-5.6-luna',
  'gpt-5.5': 'openai/gpt-5.5',
  'gpt-5.4': 'openai/gpt-5.4',
  'gpt-5.4-mini': 'openai/gpt-5.4-mini',
  'gemini-3.8-flash': 'google/gemini-3.8-flash',
  'gemini-3.7-flash': 'google/gemini-3.7-flash',
  'gemini-3.6-flash': 'google/gemini-3.6-flash',
  'gemini-3.5-flash': 'google/gemini-3.5-flash',
  'gemini-3.1-pro-preview': 'google/gemini-3.1-pro-preview',
  'grok-4.7': 'xai/grok-4.7',
  'grok-4.6': 'xai/grok-4.6',
  'grok-4.5': 'xai/grok-4.5',
  'grok-4.3': 'xai/grok-4.3',
  'deepseek-v4-pro': 'deepseek/deepseek-v4-pro',
  'deepseek-flash': 'deepseek/deepseek-flash',
  'kimi-k3': 'moonshotai/kimi-k3',
  'kimi-k2.7-code': 'moonshotai/kimi-k2.7-code',
  'kimi-k2.6': 'moonshotai/kimi-k2.6',
  'minimax-m3': 'minimax/MiniMax-M3',
  'minimax-m2.7': 'minimax/MiniMax-M2.7',
}

/** A model resolved to what the Pi CLI needs. */
export interface ResolvedPiModel {
  /** Pi provider name, e.g. `anthropic`. */
  provider: string
  /** Pi model id within the provider, e.g. `claude-sonnet-5-5`. */
  model: string
  /** The fully qualified `provider/id` passed to `--model`. */
  qualified: string
  /** How the sandbox reaches the provider. */
  access: PiProviderAccess
}

/**
 * Resolve a catalog id or a fully qualified Pi id to the provider, model and
 * credential the run needs.
 *
 * @param id - Catalog id (`claude-sonnet-5-5`) or Pi id (`openrouter/qwen/qwen3-coder`).
 * @param modelMap - Catalog-id map (defaults merged with config).
 * @param providers - Provider access table (defaults merged with config).
 * @returns The resolved model.
 * @throws {Error} When a bare id is not in the map, or the provider is unknown.
 */
export function resolvePiModel(
  id: string,
  modelMap: Readonly<Record<string, string>>,
  providers: Readonly<Record<string, PiProviderAccess>>,
): ResolvedPiModel {
  const qualified = modelMap[id] ?? id
  const slash = qualified.indexOf('/')
  if (slash <= 0 || slash === qualified.length - 1) {
    throw new Error(
      `Model "${id}" has no Pi mapping. Pass a fully qualified Pi id ("provider/id") or add it to the runtime's modelMap — a bare id would be fuzzy-matched by Pi and could select a different model.`,
    )
  }
  const provider = qualified.slice(0, slash)
  const access = providers[provider]
  if (!access) {
    throw new Error(
      `Pi provider "${provider}" (model "${qualified}") is not configured: add it to the runtime's providers with its key env var and API host.`,
    )
  }
  return { provider, model: qualified.slice(slash + 1), qualified, access }
}
