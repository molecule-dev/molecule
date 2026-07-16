/**
 * `@molecule/api-ai-image-generation-pipeline` — high-level pipeline
 * wrapping `@molecule/api-ai-image-generation` (vendor abstraction) with
 * style application, brand-model mapping, base64-to-data-URL
 * normalization, and chat-driven prompt enhancement.
 *
 * Extracted from the ai-image-generator flagship. Use it when you need
 * end-to-end "user types prompt → image" semantics with graceful fallback
 * when no provider is bonded.
 *
 * @example
 * ```ts
 * import { runImageGeneration, enhancePrompt } from '@molecule/api-ai-image-generation-pipeline'
 *
 * const enhanced = await enhancePrompt({ prompt: 'a cat' })
 * const result = await runImageGeneration({
 *   prompt: enhanced.text,
 *   size: '1024x1024',
 *   stylePromptModifier: 'photorealistic, golden hour lighting',
 *   model: 'reverie-xl-v3',
 *   provider: 'openai',
 * })
 * if (result.status === 'succeeded') console.log(result.imageUrl)
 * ```
 *
 * @remarks
 * Wiring — this package composes TWO different accessor mechanisms:
 * - `runImageGeneration()` resolves `@molecule/api-ai-image-generation`, whose
 *   core keeps its OWN singleton: wire it with THAT package's `setProvider(...)`
 *   (e.g. `setProvider(createProvider())` from
 *   `@molecule/api-ai-image-generation-openai`). A generic
 *   `bond('ai-image-generation', …)` call is never seen by that core — the
 *   pipeline then returns `status: 'queued'` forever with no error to debug.
 * - `enhancePrompt()` resolves the registry-based `@molecule/api-ai` chat bond
 *   (`bond('ai', provider)` / named providers); with none bonded it returns
 *   `{ enhanced: false, text: prompt }` instead of failing.
 *
 * `status: 'queued'` means "no image provider wired" (the graceful no-op path),
 * NOT "an async job is pending" — nothing retries it. Treat a persistent
 * `'queued'` as a wiring bug.
 *
 * @module
 */

import {
  type AIProvider,
  getProvider as getAIProvider,
  getProviderByName as getAIProviderByName,
} from '@molecule/api-ai'
import {
  getProvider as getImageProvider,
  type ImageGenerateParams,
  type ImageGenerationResult,
} from '@molecule/api-ai-image-generation'

export * from './browser-guard.js'

/** Union of terminal + intermediate image-generation states. */
export type GenerationStatus = 'succeeded' | 'failed' | 'queued'

/** Normalized outcome returned by {@link runImageGeneration} for all terminal states. */
export interface ImageGenerationOutcome {
  imageUrl: string | null
  revisedPrompt: string | null
  status: GenerationStatus
  error: string | null
}

/** Append a style modifier onto the user-typed prompt. */
export function applyStyleToPrompt(prompt: string, modifier: string | null | undefined): string {
  const m = modifier?.trim()
  if (!m) return prompt
  return `${prompt}, ${m}`
}

/**
 * Default brand-to-provider model mapper used by the flagship.
 * Override via {@link RunImageGenerationOptions.resolveModel}.
 */
export function defaultResolveModel(
  brandModel: string | undefined,
  provider: string,
): string | undefined {
  if (!brandModel) return undefined
  if (brandModel.startsWith('gpt-image') || brandModel.startsWith('dall-e')) return brandModel
  if (provider === 'openai') {
    if (brandModel === 'reverie-print') return 'dall-e-3'
    return 'gpt-image-1'
  }
  return undefined
}

/** Options accepted by {@link runImageGeneration}. */
export interface RunImageGenerationOptions {
  prompt: string
  size?: string
  style?: string
  model?: string
  provider?: string
  /** Style modifier appended to the prompt before vendor dispatch. */
  stylePromptModifier?: string | null
  /** Optional brand→vendor model translation; defaults to {@link defaultResolveModel}. */
  resolveModel?: (brandModel: string | undefined, provider: string) => string | undefined
}

/**
 * Dispatch the bonded image-generation provider and normalize output.
 * Returns `status: 'queued'` if no provider is bonded (graceful no-op),
 * `status: 'failed'` with an error if the provider throws or returns no
 * image, and `status: 'succeeded'` with an `imageUrl` otherwise.
 *
 * Base64 responses (e.g. gpt-image-1) are normalized to a `data:` URL.
 */
export async function runImageGeneration(
  opts: RunImageGenerationOptions,
): Promise<ImageGenerationOutcome> {
  const provider = getImageProvider()
  if (!provider) {
    return { imageUrl: null, revisedPrompt: null, status: 'queued', error: null }
  }
  const finalPrompt = applyStyleToPrompt(opts.prompt, opts.stylePromptModifier ?? null)
  const resolveModel = opts.resolveModel ?? defaultResolveModel
  const params: ImageGenerateParams = {
    prompt: finalPrompt,
    size: opts.size ?? '1024x1024',
    style: opts.style ?? 'natural',
    model: resolveModel(opts.model, opts.provider ?? 'openai'),
  }
  try {
    const result: ImageGenerationResult = await provider.generate(params)
    const first = result.images?.[0]
    const imageUrl = first?.url ?? (first?.base64 ? `data:image/png;base64,${first.base64}` : null)
    return {
      imageUrl,
      revisedPrompt: first?.revisedPrompt ?? null,
      status: imageUrl ? 'succeeded' : 'failed',
      error: imageUrl ? null : 'Provider returned no image',
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { imageUrl: null, revisedPrompt: null, status: 'failed', error: message }
  }
}

/** Options accepted by {@link enhancePrompt}. */
export interface EnhancePromptOptions {
  prompt: string
  /** AI provider name (e.g. 'anthropic'); falls back to default-bonded provider. */
  providerName?: string
  /** Override system instructions for the rewrite. */
  system?: string
  maxTokens?: number
  temperature?: number
}

/** Result returned by {@link enhancePrompt}. */
export interface EnhancePromptResult {
  text: string
  enhanced: boolean
}

const DEFAULT_ENHANCE_SYSTEM =
  'You are an expert prompt engineer for AI image generators. Rewrite the user-supplied prompt so it produces a more striking image. Keep the subject identical; add concrete composition, lighting, lens and material direction. Respond with ONLY the rewritten prompt, no preamble.'

/** Stream a single chat turn from `provider` and collect the text response as a string, or `null` on failure. */
async function chatToString(
  provider: AIProvider,
  opts: EnhancePromptOptions,
): Promise<string | null> {
  const collected: string[] = []
  try {
    const stream = provider.chat({
      maxTokens: opts.maxTokens ?? 600,
      temperature: opts.temperature ?? 0.7,
      system: opts.system ?? DEFAULT_ENHANCE_SYSTEM,
      messages: [{ role: 'user', content: opts.prompt }],
    })
    for await (const event of stream) {
      const e = event as { type: string; content?: string; text?: string }
      if (e.type === 'text') collected.push(e.content ?? e.text ?? '')
      if (e.type === 'error') return null
    }
  } catch (_error) {
    // Stream iteration failed (network/provider error); caller treats null as
    // "no enhancement available" and falls back to the original prompt safely.
    return null
  }
  const out = collected.join('').trim()
  return out.length > 0 ? out : null
}

/**
 * Expand a short user prompt into a richer one via the bonded chat AI
 * provider. Returns `{ enhanced: false, text: prompt }` if no provider
 * is bonded or the stream errors — the endpoint stays contractually 200
 * so the calling UI flow remains testable without an AI key.
 */
export async function enhancePrompt(opts: EnhancePromptOptions): Promise<EnhancePromptResult> {
  const provider =
    (opts.providerName ? getAIProviderByName(opts.providerName) : null) ?? getAIProvider() ?? null
  if (!provider) return { text: opts.prompt, enhanced: false }
  const enhanced = await chatToString(provider, opts)
  if (!enhanced) return { text: opts.prompt, enhanced: false }
  return { text: enhanced, enhanced: true }
}
