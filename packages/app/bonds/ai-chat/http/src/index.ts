/**
 * HTTP/SSE AI chat provider for molecule.dev.
 *
 * @remarks
 * POSTs each message to YOUR backend chat endpoint (`config.endpoint`, a RELATIVE path like
 * `/api/ai/chat` on the app's `baseUrl`) and reads the reply as an SSE stream — it does NOT talk
 * to an AI provider directly and holds NO AI key. Point `endpoint` at your own API, where the
 * provider key + `@molecule/api-ai` live; auth rides the session via the HTTP client
 * (cookie/bearer), so never attach a provider key or an absolute AI-provider URL here. See
 * `@molecule/app-ai-chat` for the safe-render rules.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'

import { createProvider } from './provider.js'

/** Pre-instantiated provider singleton. */
export const provider = createProvider()
