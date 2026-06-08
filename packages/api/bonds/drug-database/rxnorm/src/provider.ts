/**
 * RxNorm implementation of {@link DrugDatabaseProvider}.
 *
 * Wraps the NIH National Library of Medicine RxNav REST API at
 * `https://rxnav.nlm.nih.gov/REST/`. The endpoint is keyless and free for
 * any use.
 *
 * The NLM is deprecating the RxNorm interactions endpoint
 * (`/interaction/list.json`); this provider degrades gracefully — a
 * `404` / `410` / `503` response from that endpoint resolves to `[]`
 * rather than throwing, so application code can treat "no interactions
 * reported" as a normal outcome regardless of upstream availability.
 *
 * @module
 */

import type {
  DrugDatabaseProvider,
  DrugDetail,
  DrugId,
  DrugIngredient,
  DrugInteraction,
  DrugInteractionSeverity,
  DrugMatch,
} from '@molecule/api-drug-database'

import type { RxNormConfig } from './types.js'

/** Default RxNav REST API base URL. */
const DEFAULT_BASE_URL = 'https://rxnav.nlm.nih.gov/REST'

/** Default request timeout, in milliseconds. */
const DEFAULT_TIMEOUT = 10_000

/** Source identifier stamped onto every record. */
const SOURCE = 'rxnorm'

/**
 * RxNorm "term type" (TTY) classification.
 *
 * RxNorm tags every concept with a TTY indicating what kind of entity it
 * represents — e.g. `'IN'` for ingredients, `'BN'` for brand names,
 * `'SBD'` for semantic branded drugs, `'SCD'` for semantic clinical
 * drugs, `'DF'` for dosage forms.
 *
 * @see https://www.nlm.nih.gov/research/umls/rxnorm/docs/appendix5.html
 */
type RxTty = string

/**
 * RxNorm concept-properties record returned across most endpoints.
 *
 * Only the fields the provider reads are typed; RxNav returns a handful
 * of additional fields per record.
 */
interface RxConceptProperties {
  rxcui?: string
  name?: string
  synonym?: string
  tty?: RxTty
  language?: string
  suppress?: string
  umlscui?: string
}

/**
 * RxNorm concept-group record (an array of concept-properties bucketed by
 * TTY).
 */
interface RxConceptGroup {
  tty?: RxTty
  conceptProperties?: RxConceptProperties[]
}

/**
 * `/drugs.json?name=...` response shape.
 */
interface RxDrugsResponse {
  drugGroup?: {
    name?: string
    conceptGroup?: RxConceptGroup[]
  }
}

/**
 * `/rxcui/:id/properties.json` response shape.
 */
interface RxPropertiesResponse {
  properties?: RxConceptProperties
}

/**
 * `/rxcui/:id/related.json?tty=...` response shape.
 */
interface RxRelatedResponse {
  relatedGroup?: {
    rxcui?: string
    termType?: RxTty[]
    conceptGroup?: RxConceptGroup[]
  }
}

/**
 * `/rxcui/:id/ndcs.json` response shape.
 */
interface RxNdcsResponse {
  ndcGroup?: {
    rxcui?: string
    ndcList?: {
      ndc?: string[]
    }
  }
}

/**
 * `/interaction/list.json?rxcuis=...` response shape.
 *
 * The endpoint is being deprecated — a `404` / `410` / `503` resolves to
 * `[]` upstream of this type rather than producing an empty body of this
 * shape.
 */
interface RxInteractionListResponse {
  fullInteractionTypeGroup?: Array<{
    sourceName?: string
    sourceDisclaimer?: string
    fullInteractionType?: Array<{
      comment?: string
      minConcept?: Array<{ rxcui?: string; name?: string; tty?: RxTty }>
      interactionPair?: Array<{
        description?: string
        severity?: string
        interactionConcept?: Array<{
          minConceptItem?: { rxcui?: string; name?: string; tty?: RxTty }
          sourceConceptItem?: { id?: string; name?: string; url?: string }
        }>
      }>
    }>
  }>
}

/**
 * Internal HTTP error raised by {@link fetchJson} for non-OK statuses.
 *
 * Carries the upstream status code so callers can map specific statuses
 * (404 / 410 / 503 from `/interaction/list.json`) onto graceful
 * degradation paths rather than rethrowing.
 */
class RxNormHttpError extends Error {
  public readonly status: number

  public constructor(status: number) {
    super(`RxNorm API request failed with status ${String(status)}`)
    this.name = 'RxNormHttpError'
    this.status = status
  }
}

/**
 * Strips a trailing slash from the configured base URL so endpoint paths
 * can always be appended with a leading slash.
 *
 * @param baseUrl - Raw base URL.
 * @returns The URL without trailing slash.
 */
const normalizeBaseUrl = (baseUrl: string): string =>
  baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl

/**
 * Performs a GET request against RxNav and parses the JSON response.
 *
 * Maps non-OK statuses onto {@link RxNormHttpError} carrying the upstream
 * status code.
 *
 * @template T - Expected JSON response shape.
 * @param url - Fully-constructed request URL including query params.
 * @param config - Provider configuration (used for timeout).
 * @returns Parsed JSON body cast to `T`.
 * @throws {RxNormHttpError} On any non-OK status.
 */
const fetchJson = async <T>(url: string, config: RxNormConfig): Promise<T> => {
  const timeout = config.timeout ?? DEFAULT_TIMEOUT
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  const headers: Record<string, string> = {
    Accept: 'application/json',
  }
  try {
    const response = await fetch(url, { signal: controller.signal, headers })
    if (!response.ok) {
      throw new RxNormHttpError(response.status)
    }
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Returns `true` for the HTTP statuses that signal the deprecated /
 * unavailable RxNorm interactions endpoint.
 *
 * @param status - Upstream HTTP status code.
 * @returns `true` for `404`, `410`, or `503`.
 */
const isDeprecatedInteractionsStatus = (status: number): boolean =>
  status === 404 || status === 410 || status === 503

/**
 * Normalizes a free-text severity value from RxNav onto the core
 * {@link DrugInteractionSeverity} enum.
 *
 * RxNav historically reported severity as one of `'high'`, `'severe'`,
 * `'moderate'`, `'low'`, `'minor'`, or unset. Unknown values map to
 * `'unknown'` rather than the closest neighbour — application code that
 * needs finer granularity should consume a clinical-grade provider.
 *
 * @param raw - Raw severity string from upstream (case-insensitive).
 * @returns Normalized severity value.
 */
const normalizeSeverity = (raw: string | undefined): DrugInteractionSeverity => {
  if (!raw) {
    return 'unknown'
  }
  const lower = raw.trim().toLowerCase()
  if (lower === 'high' || lower === 'severe' || lower === 'contraindicated') {
    return 'high'
  }
  if (lower === 'moderate' || lower === 'medium') {
    return 'moderate'
  }
  if (lower === 'low' || lower === 'minor') {
    return 'low'
  }
  return 'unknown'
}

/**
 * Flattens the concept-groups returned by `/drugs.json`,
 * `/related.json`, and similar endpoints into a single
 * `conceptProperties` array.
 *
 * @param groups - The `conceptGroup` array as returned by RxNav.
 * @returns A single flat array of concept-properties records.
 */
const flattenConceptGroups = (groups: RxConceptGroup[] | undefined): RxConceptProperties[] => {
  if (!groups) {
    return []
  }
  const out: RxConceptProperties[] = []
  for (const group of groups) {
    if (group.conceptProperties) {
      out.push(...group.conceptProperties)
    }
  }
  return out
}

/**
 * Selects only the concept-groups whose TTY matches the supplied set.
 *
 * @param groups - The `conceptGroup` array as returned by RxNav.
 * @param ttys - Set of TTY values to keep.
 * @returns A new array containing only matching groups.
 */
const filterGroupsByTty = (
  groups: RxConceptGroup[] | undefined,
  ttys: Set<RxTty>,
): RxConceptGroup[] => {
  if (!groups) {
    return []
  }
  return groups.filter((group): group is RxConceptGroup => !!group.tty && ttys.has(group.tty))
}

/**
 * RxNorm TTY values that indicate a "branded" concept.
 */
const BRAND_TTYS: ReadonlySet<RxTty> = new Set(['BN', 'SBD', 'SBDC', 'SBDF', 'SBDG'])

/**
 * RxNorm TTY values that indicate a "generic / clinical" concept.
 */
const GENERIC_TTYS: ReadonlySet<RxTty> = new Set([
  'IN',
  'PIN',
  'MIN',
  'SCD',
  'SCDC',
  'SCDF',
  'SCDG',
])

/**
 * Maps a raw RxNorm concept-properties record onto a {@link DrugMatch}.
 *
 * @param record - Raw concept-properties record.
 * @returns The normalized search-result row.
 */
const mapMatch = (record: RxConceptProperties): DrugMatch => {
  const id = record.rxcui ?? ''
  const name = record.name ?? ''
  const tty = record.tty
  const isBrand = !!tty && BRAND_TTYS.has(tty)
  const isGeneric = !!tty && GENERIC_TTYS.has(tty)
  return {
    id,
    name,
    genericName: isGeneric ? name : null,
    brandName: isBrand ? name : null,
    source: SOURCE,
  }
}

/**
 * Builds the `/drugs.json?name=...` URL.
 *
 * @param baseUrl - Normalized base URL.
 * @param query - Free-text query.
 * @returns Fully-constructed request URL.
 */
const buildDrugsUrl = (baseUrl: string, query: string): string => {
  const params = new URLSearchParams({ name: query })
  return `${baseUrl}/drugs.json?${params.toString()}`
}

/**
 * Builds the `/rxcui/:id/properties.json` URL.
 *
 * @param baseUrl - Normalized base URL.
 * @param id - RxCUI.
 * @returns Fully-constructed request URL.
 */
const buildPropertiesUrl = (baseUrl: string, id: DrugId): string =>
  `${baseUrl}/rxcui/${encodeURIComponent(id)}/properties.json`

/**
 * Builds the `/rxcui/:id/related.json?tty=IN+SBD+SCD+DF` URL.
 *
 * @param baseUrl - Normalized base URL.
 * @param id - RxCUI.
 * @returns Fully-constructed request URL.
 */
const buildRelatedUrl = (baseUrl: string, id: DrugId): string => {
  // URLSearchParams encodes spaces as `+` (correct for RxNav's `tty=`
  // multi-value form).
  const params = new URLSearchParams({ tty: 'IN SBD SCD DF BN' })
  return `${baseUrl}/rxcui/${encodeURIComponent(id)}/related.json?${params.toString()}`
}

/**
 * Builds the `/rxcui/:id/ndcs.json` URL.
 *
 * @param baseUrl - Normalized base URL.
 * @param id - RxCUI.
 * @returns Fully-constructed request URL.
 */
const buildNdcsUrl = (baseUrl: string, id: DrugId): string =>
  `${baseUrl}/rxcui/${encodeURIComponent(id)}/ndcs.json`

/**
 * Builds the `/interaction/list.json?rxcuis=...` URL.
 *
 * @param baseUrl - Normalized base URL.
 * @param drugIds - RxCUIs to include in the query.
 * @returns Fully-constructed request URL.
 */
const buildInteractionsUrl = (baseUrl: string, drugIds: DrugId[]): string => {
  // RxNav expects rxcuis as a `+`-separated list inside a single query
  // parameter.
  const params = new URLSearchParams({ rxcuis: drugIds.join(' ') })
  return `${baseUrl}/interaction/list.json?${params.toString()}`
}

/**
 * Picks the best brand / generic names from a properties record + a
 * related-concepts response.
 *
 * @param properties - The `/rxcui/:id/properties.json` result.
 * @param related - The `/rxcui/:id/related.json` result, when fetched.
 * @returns A `{ genericName, brandName }` pair, each `null` when the
 *   upstream response does not classify a concept under that TTY.
 */
const pickGenericAndBrand = (
  properties: RxConceptProperties,
  related: RxRelatedResponse | null,
): { genericName: string | null; brandName: string | null } => {
  let genericName: string | null = null
  let brandName: string | null = null

  // Use the requested concept itself first.
  const tty = properties.tty
  const name = properties.name ?? ''
  if (name.length > 0) {
    if (tty && GENERIC_TTYS.has(tty)) {
      genericName = name
    } else if (tty && BRAND_TTYS.has(tty)) {
      brandName = name
    }
  }

  if (!related?.relatedGroup) {
    return { genericName, brandName }
  }

  const groups = related.relatedGroup.conceptGroup ?? []
  if (genericName === null) {
    const ingredientGroup = filterGroupsByTty(groups, new Set(['IN', 'PIN', 'MIN', 'SCD']))
    const first = flattenConceptGroups(ingredientGroup)[0]
    if (first?.name) {
      genericName = first.name
    }
  }
  if (brandName === null) {
    const brandGroup = filterGroupsByTty(groups, new Set(['BN', 'SBD']))
    const first = flattenConceptGroups(brandGroup)[0]
    if (first?.name) {
      brandName = first.name
    }
  }

  return { genericName, brandName }
}

/**
 * Extracts the dosage forms from a related-concepts response.
 *
 * @param related - The `/rxcui/:id/related.json` result.
 * @returns Array of dosage-form names. Empty array when the upstream
 *   response carries none.
 */
const pickDosageForms = (related: RxRelatedResponse | null): string[] => {
  if (!related?.relatedGroup?.conceptGroup) {
    return []
  }
  const dfGroups = filterGroupsByTty(related.relatedGroup.conceptGroup, new Set(['DF']))
  const records = flattenConceptGroups(dfGroups)
  const names: string[] = []
  for (const record of records) {
    if (record.name && record.name.length > 0) {
      names.push(record.name)
    }
  }
  return names
}

/**
 * Extracts ingredients from a related-concepts response.
 *
 * @param related - The `/rxcui/:id/related.json` result.
 * @returns Array of normalized {@link DrugIngredient} records. Empty array
 *   when the upstream response breaks out no ingredients.
 */
const pickIngredients = (related: RxRelatedResponse | null): DrugIngredient[] => {
  if (!related?.relatedGroup?.conceptGroup) {
    return []
  }
  const ingredientGroups = filterGroupsByTty(
    related.relatedGroup.conceptGroup,
    new Set(['IN', 'PIN', 'MIN']),
  )
  const records = flattenConceptGroups(ingredientGroups)
  const out: DrugIngredient[] = []
  for (const record of records) {
    if (record.name && record.name.length > 0) {
      out.push({
        id: record.rxcui && record.rxcui.length > 0 ? record.rxcui : null,
        name: record.name,
        // RxNav's IN/PIN/MIN concepts do not carry strength — that lives
        // on SCDC / SCDF concepts. The free-text strength on the original
        // SCD/SBD concept name (e.g. "metformin 500 MG Oral Tablet") is
        // not deterministically parseable, so we surface it as null here.
        strength: null,
      })
    }
  }
  return out
}

/**
 * Maps a single RxNav `fullInteractionType` entry onto an array of core
 * {@link DrugInteraction} records — one per `interactionPair`.
 *
 * @param entry - One `fullInteractionType` from the upstream response.
 * @param sourceName - Source identifier from the enclosing
 *   `fullInteractionTypeGroup`.
 * @returns Normalized interactions.
 */
const mapInteractionEntry = (
  entry: NonNullable<
    NonNullable<
      RxInteractionListResponse['fullInteractionTypeGroup']
    >[number]['fullInteractionType']
  >[number],
  sourceName: string | undefined,
): DrugInteraction[] => {
  const minConcepts = entry.minConcept ?? []
  const involvedIds = minConcepts
    .map((c) => c.rxcui)
    .filter((id): id is string => typeof id === 'string' && id.length > 0)
  const pairs = entry.interactionPair ?? []
  const out: DrugInteraction[] = []
  for (const pair of pairs) {
    const pairIds = (pair.interactionConcept ?? [])
      .map((concept) => concept.minConceptItem?.rxcui)
      .filter((id): id is string => typeof id === 'string' && id.length > 0)
    const drugIds = pairIds.length >= 2 ? pairIds : involvedIds
    out.push({
      drugIds,
      severity: normalizeSeverity(pair.severity),
      description: pair.description ?? '',
      sources: sourceName && sourceName.length > 0 ? [sourceName] : [],
    })
  }
  return out
}

/**
 * Maps a `/interaction/list.json` response onto an array of core
 * {@link DrugInteraction} records.
 *
 * @param response - The parsed upstream response.
 * @returns Normalized interactions. Empty array when the response carries
 *   no `fullInteractionTypeGroup`.
 */
const mapInteractionResponse = (response: RxInteractionListResponse): DrugInteraction[] => {
  const groups = response.fullInteractionTypeGroup ?? []
  const out: DrugInteraction[] = []
  for (const group of groups) {
    const sourceName = group.sourceName
    const entries = group.fullInteractionType ?? []
    for (const entry of entries) {
      out.push(...mapInteractionEntry(entry, sourceName))
    }
  }
  return out
}

/**
 * Creates an RxNorm drug-database provider.
 *
 * @param config - Provider configuration. All fields are optional.
 * @returns A {@link DrugDatabaseProvider} backed by the RxNav REST API.
 */
export const createProvider = (config: RxNormConfig = {}): DrugDatabaseProvider => {
  const baseUrl = normalizeBaseUrl(config.baseUrl ?? DEFAULT_BASE_URL)

  return {
    async searchDrug(query: string): Promise<DrugMatch[]> {
      if (query.trim().length === 0) {
        return []
      }
      const url = buildDrugsUrl(baseUrl, query)
      const data = await fetchJson<RxDrugsResponse>(url, config)
      const records = flattenConceptGroups(data.drugGroup?.conceptGroup)
      return records.map(mapMatch)
    },

    async getDrug(id: DrugId): Promise<DrugDetail | null> {
      const propertiesUrl = buildPropertiesUrl(baseUrl, id)
      const propertiesResp = await fetchJson<RxPropertiesResponse>(propertiesUrl, config)
      const properties = propertiesResp.properties
      if (!properties || !properties.rxcui) {
        return null
      }

      // Fetch related concepts to populate dosage forms + ingredients +
      // brand/generic cross-references. A failure to fetch related data
      // SHOULD NOT mask the primary properties response — degrade to an
      // empty `related` and surface what we have.
      let related: RxRelatedResponse | null
      try {
        related = await fetchJson<RxRelatedResponse>(buildRelatedUrl(baseUrl, id), config)
      } catch (_error) {
        // Best-effort: a failure to fetch related concepts (e.g. network
        // blip, upstream 404 on a new RxCUI) must not mask the primary
        // properties response. Callers receive a valid DrugDetail with
        // empty ingredients/dosageForms rather than a thrown error.
        related = null
      }

      const { genericName, brandName } = pickGenericAndBrand(properties, related)
      return {
        id: properties.rxcui,
        name: properties.name ?? '',
        genericName,
        brandName,
        dosageForms: pickDosageForms(related),
        ingredients: pickIngredients(related),
        source: SOURCE,
      }
    },

    async checkInteractions(drugIds: DrugId[]): Promise<DrugInteraction[]> {
      if (drugIds.length < 2) {
        return []
      }
      const url = buildInteractionsUrl(baseUrl, drugIds)
      try {
        const data = await fetchJson<RxInteractionListResponse>(url, config)
        return mapInteractionResponse(data)
      } catch (err) {
        if (err instanceof RxNormHttpError && isDeprecatedInteractionsStatus(err.status)) {
          // Deprecation-aware degradation: NLM has been retiring this
          // endpoint. Treat a deprecated / unavailable interactions
          // service as "no interactions reported" rather than throwing.
          return []
        }
        throw err
      }
    },

    async getNDCs(drugId: DrugId): Promise<string[]> {
      const url = buildNdcsUrl(baseUrl, drugId)
      const data = await fetchJson<RxNdcsResponse>(url, config)
      const ndcs = data.ndcGroup?.ndcList?.ndc ?? []
      return ndcs.filter((value): value is string => typeof value === 'string' && value.length > 0)
    },
  }
}

/** Lazily-initialized default provider instance. */
let _provider: DrugDatabaseProvider | null = null

/**
 * The provider implementation, lazily initialized on first use.
 *
 * Reads `RXNORM_BASE_URL` from environment variables. The RxNav public
 * API requires no key; production deployments may override the base URL
 * to point at a mirror.
 */
export const provider: DrugDatabaseProvider = new Proxy({} as DrugDatabaseProvider, {
  get(_, prop, receiver) {
    if (!_provider) {
      _provider = createProvider({
        ...(process.env['RXNORM_BASE_URL'] ? { baseUrl: process.env['RXNORM_BASE_URL'] } : {}),
      })
    }
    return Reflect.get(_provider, prop, receiver)
  },
})
