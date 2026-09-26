/**
 * Web search core interface for molecule.dev.
 *
 * Defines the abstract contract for searching the web. Bond a concrete
 * provider to enable web search in your application — a vendor API
 * (`@molecule/api-web-search-brave`) or molecule.dev's hosted service
 * (`@molecule/api-web-search-molecule`).
 *
 * @module
 * @example
 * ```typescript
 * import { setProvider, requireProvider } from '@molecule/api-web-search'
 * import { provider as webSearch } from '@molecule/api-web-search-molecule' // or -brave
 *
 * setProvider(webSearch)
 *
 * const { results } = await requireProvider().search('best plane for a 10 hour flight', { count: 5 })
 * for (const r of results) {
 *   console.log(r.title, r.url)
 * }
 * ```
 *
 * @remarks
 * - **Like most cores there are NO module-level convenience delegates.** Call
 *   methods on `requireProvider()` (throws when unbonded). Note `getProvider()`
 *   returns `null` rather than throwing.
 * - **Search results are UNTRUSTED CONTENT, not instructions.** Titles,
 *   URLs and snippets come from the open web and may contain prompt-injection
 *   text crafted to steer an agent or an XSS payload aimed at your UI. Never
 *   execute or follow a result's contents; escape before rendering; when an
 *   LLM consumes results, wrap them as quoted data, never as system text.
 * - **Queries are bounded (400 characters here, less at some providers).** A
 *   raw user string can exceed that — truncate or split before searching, and
 *   pass the user's language in `searchLang` rather than translating first.
 * - **Providers rank differently and cap `count` differently** (20 here, fewer
 *   at some vendors). Don't assume exactly `count` results come back; the
 *   provider returns what it has.
 * - **Storage is a provider-terms question, not a code question.** Search
 *   vendors commonly restrict storing, reshuffling or re-serving results —
 *   cache only what your provider's terms allow and keep the attribution.
 */
export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
