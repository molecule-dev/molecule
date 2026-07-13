/**
 * Local (OpenAI-compatible) ai-local provider for molecule.dev.
 *
 * Streams chat completions from any local inference server that speaks the
 * OpenAI `chat/completions` protocol (Ollama, LM Studio, llama.cpp, vLLM),
 * keyless by default.
 *
 * @remarks
 * **Error message disambiguation**: a plain 400 that ISN'T a context-length error (bad param,
 * malformed tool schema) gets its own non-retryable message distinct from the generic
 * "AI service error. Please try again." used for retryable failures.
 *
 * @module
 */

export { createProvider, LocalAIProvider } from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AIProvider } from '@molecule/api-ai'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so env vars / config are resolved. */
let _provider: AIProvider | null = null
/** The provider implementation. Constructs keyless — no secret required. */
export const provider: AIProvider = new Proxy({} as AIProvider, {
  get(_, prop, receiver) {
    if (!_provider) _provider = createProvider()
    return Reflect.get(_provider, prop, receiver)
  },
  // set trap: methods run with `this` bound to the proxy — without it, instance-state writes land on the dummy target and are lost (see api-push-notifications-web-push)
  set(_, prop, value) {
    if (!_provider) _provider = createProvider()
    return Reflect.set(_provider, prop, value)
  },
})
