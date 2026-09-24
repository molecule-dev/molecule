/**
 * RxNorm drug-database provider for molecule.dev.
 *
 * Implements the `DrugDatabaseProvider` interface against the public
 * NIH National Library of Medicine RxNav REST API at
 * `https://rxnav.nlm.nih.gov/REST/`. The endpoint is keyless and free
 * for any use.
 *
 * The NLM is deprecating the RxNorm interactions endpoint
 * (`/interaction/list.json`); this provider degrades gracefully, mapping
 * `404` / `410` / `503` responses from that endpoint onto an empty
 * `DrugInteraction[]` rather than throwing.
 *
 * @example
 * ```typescript
 * import { checkInteractions, getDrug, searchDrug, setProvider } from '@molecule/api-drug-database'
 * import { provider } from '@molecule/api-drug-database-rxnorm'
 *
 * // Startup: bond once. RxNav is keyless — no env vars required.
 * setProvider(provider)
 *
 * const matches = await searchDrug('metformin') // [{ id: '861007', name, genericName, brandName, source }]
 * const first = matches[0]
 * const detail = first ? await getDrug(first.id) : null // null when the RxCUI is unknown
 * console.log(detail?.name, detail?.dosageForms, detail?.ingredients.map((i) => i.name))
 *
 * // Ids are RxCUIs (strings). Fewer than 2 ids → [] without a network call.
 * const interactions = await checkInteractions(['861007', '310965'])
 * // [] also when NLM's retired interactions endpoint answers 404/410/503 — NOT "safe".
 * ```
 *
 * @remarks
 * - **Wire it through the core**: `setProvider(provider)` from `@molecule/api-drug-database`,
 *   then call the core's `searchDrug` / `getDrug` / `checkInteractions` / `getNDCs`.
 * - **An empty `checkInteractions()` result does NOT mean "no interactions".** NLM retired the
 *   RxNav interaction API; this bond maps its 404/410/503 to `[]`. Never present `[]` as a
 *   safety guarantee — show "interaction data unavailable" or use a clinical-grade provider.
 * - **Ids are RxCUI strings** (`'861007'`), not drug names or NDCs. `getDrug()` returns `null`
 *   for an unknown RxCUI; `searchDrug('')` returns `[]` without calling the API.
 * - `ingredients[].strength` is always `null` (RxNav ingredient concepts carry no strength).
 * - Not medical advice: data is informational, straight from the public NLM API.
 *   `RXNORM_BASE_URL` (optional) points the lazy `provider` at a mirror; `timeout` in
 *   `createProvider({ baseUrl, timeout })` is milliseconds (default `10000`).
 *
 * @module
 */

export * from './browser-guard.js'
export * from './provider.js'
export * from './types.js'
