/**
 * molecule.dev hosted translation provider.
 *
 * Implements the `@molecule/api-ai-translation` contract by calling
 * molecule.dev's hosted translation service with a project API key — no
 * DeepL/Google account needed. molecule.dev translates with a language model
 * (every language an app is likely to ship), keeps `protect` placeholders
 * intact, and meters the characters to the project the key belongs to.
 *
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-ai-translation'
 * import { provider } from '@molecule/api-ai-translation-molecule'
 *
 * setProvider(provider) // reads MOLECULE_API_KEY on first use
 *
 * const { translations } = await requireProvider().translate({
 *   text: ['{{count}} items in your cart', 'Checkout'],
 *   targetLang: 'de',
 *   protect: ['{{count}}'],
 *   context: 'Labels in an online store',
 * })
 * ```
 *
 * @remarks
 * - Config: `MOLECULE_API_KEY` (required — a project key from
 *   `mlcl apikey create`; in a molecule.dev sandbox the platform writes it for you)
 *   and `MOLECULE_SERVICES_URL` (optional, default
 *   `https://api.molecule.dev/api/v1/services`).
 * - **Server-side only.** The key bills your project — never ship it to a browser;
 *   call this from your API and rate-limit any route that translates user input.
 * - Per call: at most 200 texts, 5,000 characters each, 50,000 in total. Split larger
 *   jobs. A 413 names the limit that was hit.
 * - Pass placeholders in `protect` — and still check every result holds them before
 *   storing it; a model can drop one.
 * - Only `text`, `targetLang`, `sourceLang`, `protect` and `context` are sent;
 *   `formality`, `glossaryId`, `tagHandling` and `modelType` are not supported.
 * - Errors throw an `Error` with the HTTP `status` and molecule's `errorKey`: 401/403
 *   (bad or under-scoped key — the key needs scope `broker` or
 *   `broker:translation`), 402 (the project's budget is used up), 429 (rate
 *   limited — retry later), 502 (the translation model failed — retry).
 * - Molecule's other translation bonds (`-deepl`, `-google`, `-llm`) take the same
 *   calls, so switching away is one import.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './secrets.js'
export * from './types.js'
