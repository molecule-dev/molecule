/**
 * OpenAI image-generation provider for molecule.dev (gpt-image-1 + DALL·E 3).
 *
 * @remarks
 * This bond exports `createProvider()` ONLY — there is no eager `provider`
 * const (unlike sibling bonds). Wire it with the core's
 * `setProvider(createProvider())` from `@molecule/api-ai-image-generation` —
 * NOT `bond('ai-image-generation', …)`: that core keeps its own singleton and
 * never reads the bond registry (see the core's docs).
 *
 * Config: `OPENAI_API_KEY` (SERVER-side only; NOT fail-fast — a missing key
 * surfaces as the upstream 401 on first use), optional `defaultModel`
 * (default `gpt-image-1`), `defaultSize` (default `1024x1024`), and `baseUrl`
 * (`OPENAI_BASE_URL` env var, for proxies/gateways).
 *
 * Size/quality quirks are normalized for you: a requested `size` outside the
 * active model's whitelist is mapped to the closest supported one (dall-e-3:
 * 1024x1024 | 1024x1792 | 1792x1024; gpt-image-1: 1024x1024 | 1024x1536 |
 * 1536x1024 | auto), and `quality` is omitted unless explicitly set — 'auto'
 * is only valid for gpt-image-1; dall-e-3 accepts 'standard' | 'hd'.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
