/**
 * DeepSeek AI provider for molecule.dev.
 *
 * @remarks
 * Config: `DEEPSEEK_API_KEY` (SERVER-side only) plus an optional default model id/base URL.
 *
 * **Missing `DEEPSEEK_API_KEY` fails fast**: the provider throws naming the exact env var on
 * first use (the exported `provider` is a lazy proxy, so this fires on the first `chat()` call,
 * not at bond/module-load time) — it never silently sends an empty key.
 *
 * **Error message disambiguation**: a plain 400 that ISN'T a context-length error (bad param,
 * malformed tool schema) gets its own non-retryable message distinct from the generic
 * "AI service error. Please try again." used for retryable failures.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'

import type { AIProvider } from '@molecule/api-ai'

import { createProvider } from './provider.js'

/** Lazily-initialized provider singleton. Defers creation until first use so that env vars / secrets are resolved. */
let _provider: AIProvider | null = null
/**
 * The provider implementation.
 */
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
