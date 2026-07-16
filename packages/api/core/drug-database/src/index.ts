/**
 * Provider-agnostic drug-database interface for molecule.dev.
 *
 * Defines the {@link DrugDatabaseProvider} interface for drug catalog +
 * interaction lookups (free-text search, full-detail lookup, interaction
 * checking, NDC enumeration). Bond packages (RxNorm, openFDA, etc.)
 * implement this interface. Application code uses the convenience
 * functions (`searchDrug`, `getDrug`, `checkInteractions`, `getNDCs`)
 * which delegate to the bonded provider.
 *
 * @example
 * ```typescript
 * import { setProvider, searchDrug, checkInteractions } from '@molecule/api-drug-database'
 * import { provider as rxnorm } from '@molecule/api-drug-database-rxnorm'
 *
 * setProvider(rxnorm)
 * const matches = await searchDrug('metformin')
 * const interactions = await checkInteractions(['860975', '1191'])
 * ```
 *
 * @remarks
 * - **An empty `checkInteractions()` result is NOT a safety verdict.** The
 *   contract lets providers degrade to `[]` when their upstream lacks
 *   interaction coverage — render it as "no known interactions found" with any
 *   medical disclaimer intact, never as "safe to combine".
 * - **`DrugId` is provider-specific** (e.g. an RxNorm RXCUI). Obtain ids from
 *   `searchDrug()` results or store what the bonded provider returned — never
 *   hardcode ids from a different vendor's catalogue.
 * - **Server-side only.** Lookups belong in API handlers; expose app endpoints
 *   for the UI. Upstream medical APIs are rate-limited — debounce user-typed
 *   search and cache `getDrug()` detail lookups.
 * - `getDrug()` resolves `null` for an unknown id — map it to a 404, not a 500.
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip.
 * This is HEALTH data: an empty or partial result rendered as if it were
 * complete is a SAFETY bug, not a cosmetic one — hold every box to that bar:
 * - [ ] Searching a known drug (e.g. "ibuprofen") through the app's UI returns
 *   the REAL matching record from the bonded provider — the actual drug name
 *   plus whatever a `DrugMatch` exposes (generic vs brand name, `source`) —
 *   rendered in the results, never an empty list, a spinner that never
 *   resolves, or placeholder text.
 * - [ ] Search handles brand vs generic and partial names sensibly: a brand
 *   query (e.g. "Advil") and its generic ("ibuprofen") both find the drug and
 *   the UI reflects the brand/generic distinction, and a partial name (e.g.
 *   "ibupro") still surfaces the intended drug rather than nothing.
 * - [ ] Opening a result loads full detail via `getDrug(id)`: the drug's real
 *   dosage forms and ingredient breakdown (ingredient names with their
 *   strengths) — plus NDC codes via `getNDCs(id)` if the app exposes them —
 *   render for a known drug as real content, not empty arrays shown as blank
 *   sections. Ids fed to `getDrug`/`getNDCs` are ones `searchDrug` returned for
 *   this same provider, never hardcoded from another vendor's catalogue.
 * - [ ] If the app exposes drug-INTERACTION checking, assert BOTH directions on
 *   real data: a known interacting pair (e.g. warfarin + aspirin) is FLAGGED
 *   with its severity/description, AND a known non-interacting pair is NOT
 *   flagged. A checker that flags everything, or flags nothing, is dangerously
 *   broken — one all-clear and one warning together prove it discriminates.
 * - [ ] An unknown or misspelled drug returns a clear "not found" (or
 *   suggestions) in the UI — `searchDrug` resolving to `[]` and `getDrug` to
 *   `null` (a 404, not a 500) — never a wrong drug presented as the
 *   authoritative match.
 * - [ ] CORRECTNESS / SAFETY — empty or partial safety data is never shown as
 *   if it were complete. `checkInteractions` returns `[]` both when there are
 *   genuinely no interactions AND when the upstream interactions endpoint is
 *   unavailable or deprecated (see {@link DrugInteraction}); a failed or empty
 *   interaction lookup MUST read as "no known interactions found" with any
 *   medical disclaimer intact — NEVER as "no interactions" / "safe to combine".
 *   A provider error (upstream down, rate-limited, no provider bonded) surfaces
 *   as a readable message, not a blank screen, a silent empty result, or a 500.
 * - [ ] The provider runs SERVER-SIDE only: lookups go through this app's own
 *   API, and any upstream medical-API key never reaches the browser, the client
 *   bundle, or network traffic the user can inspect.
 *
 * @module
 */

// Type exports
export * from './browser-guard.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
