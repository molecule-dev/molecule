/**
 * OpenAI image-generation provider for molecule.dev (gpt-image-1 + DALL·E 3).
 *
 * @example
 * ```typescript
 * import { requireProvider, setProvider } from '@molecule/api-ai-image-generation'
 * import { createProvider } from '@molecule/api-ai-image-generation-openai'
 *
 * // Startup (server only): the key comes from the server env.
 * setProvider(createProvider({ apiKey: process.env.OPENAI_API_KEY, defaultModel: 'gpt-image-1' }))
 *
 * const { images } = await requireProvider().generate({
 *   prompt: 'A lighthouse at dusk, oil painting',
 *   size: '1536x1024', // landscape; unsupported sizes snap to the closest allowed one
 * })
 * // gpt-image-1 returns base64 (no URL); dall-e-3 returns a temporary `url` instead.
 * const image = images[0]
 * const src = image?.url ?? `data:image/png;base64,${image?.base64 ?? ''}`
 * console.log(src.slice(0, 22)) // 'data:image/png;base64,'
 * ```
 *
 * @remarks
 * This bond exports `createProvider()` ONLY — there is no `provider` const
 * (unlike sibling bonds). Wire it with the core's
 * `setProvider(createProvider({ ... }))` from `@molecule/api-ai-image-generation`;
 * importing this package wires nothing by itself.
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
