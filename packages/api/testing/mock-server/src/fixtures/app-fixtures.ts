/**
 * Fixture loading from JSON files in a directory.
 * Each JSON file becomes a resource or endpoint group.
 * No hardcoded app-specific data — all data lives in template fixture directories.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'

import type {
  AppDataPool,
  AppFixtureSet,
  EndpointDefinition,
  EndpointFixture,
  FixtureRecord,
} from '../types.js'
import { createSeededRandom, randomInt, recentDate, seededUUID, seedFromPath } from './seed.js'
import { applySemanticRules } from './semantic-generator.js'

/* ------------------------------------------------------------------ */
/*  Single-object response synthesis                                   */
/* ------------------------------------------------------------------ */

/** Field names that should resolve to an array of records (top-N lists, recent activity, etc.). */
const ARRAY_FIELD_RE =
  /^(points|items|data|results|rows|recent|top|history|entries|list|series|breakdown|timeline|activity|feed|chart|buckets|labels|datasets|trend|trends|posts|orders|transactions|events|notifications|messages|members|users|categories|tags|reviews|sessions|logs)/i

/** Field names that are a time/value series for a chart (one point per day). */
const CHART_SERIES_RE =
  /^(points|series|trend|trends|history|timeline|chart|chartData|graph|daily|weekly|monthly|overTime|byDay)/i

/**
 * Build a small array of generic records. Each record carries a grab-bag of
 * the most common field names so whatever a list/chart component reads, it
 * finds a plausible value rather than `undefined`.
 * @param field
 * @param rng
 */
function generateRecordArray(field: string, rng: () => number): unknown[] {
  const isChart = CHART_SERIES_RE.test(field)
  const count = isChart ? 7 : 5
  const out: unknown[] = []
  for (let i = 0; i < count; i++) {
    if (isChart) {
      const v = randomInt(rng, 20, 4000)
      const d = new Date(Date.UTC(2026, 3, 16 - (count - 1 - i)))
      out.push({
        date: d.toISOString().slice(0, 10),
        label: d.toISOString().slice(5, 10),
        value: v,
        views: v,
        count: v,
        amount: v,
        total: v,
        revenue: v,
      })
    } else {
      const n = randomInt(rng, 10, 9000)
      out.push({
        id: seededUUID(rng),
        title: `Sample ${field} ${i + 1}`,
        name: `Sample ${field} ${i + 1}`,
        label: `Item ${i + 1}`,
        status: 'published',
        date: recentDate(rng),
        createdAt: recentDate(rng),
        views: n,
        count: n,
        value: n,
        amount: n,
        total: n,
      })
    }
  }
  return out
}

/**
 * Synthesize a realistic value for a single response field, by name.
 * Array-ish names yield a small array of generic records (chart points or
 * list rows); everything else goes through the semantic rules with
 * type-flavoured fallbacks.
 * @param field
 * @param rng
 * @param index
 */
function generateFieldValue(field: string, rng: () => number, index: number): unknown {
  if (ARRAY_FIELD_RE.test(field)) return generateRecordArray(field, rng)
  const semantic = applySemanticRules(field, rng, index)
  if (semantic !== undefined) return semantic
  if (/(_id$|^id$)/i.test(field)) return seededUUID(rng)
  if (/(at$|date$|_date|timestamp)/i.test(field)) return recentDate(rng)
  if (
    /^(is|has|can|show|enable|enabled|allow|allowed)[A-Z]?|active$|visible$|verified$|public$/i.test(
      field,
    )
  ) {
    return rng() > 0.5
  }
  if (/(url$|link$|image$|avatar$|icon$|photo$)/i.test(field)) {
    return `https://picsum.photos/seed/${index}/400/400`
  }
  if (
    /(name|title|label|slug|description|bio|message|summary|text|subject|note|headline)$/i.test(
      field,
    )
  ) {
    return `Sample ${field}`
  }
  if (/(theme|mode|status|state|type|tier|plan|role|level|visibility)$/i.test(field)) {
    return 'active'
  }
  // Nested-object fields (preferences, settings, metadata, …) — `{}` is the
  // safe shape; callers read sub-keys with optional chaining + defaults.
  if (
    /(preferences|settings|config|metadata|^meta$|options|oauthdata|profile|address|location)$/i.test(
      field,
    )
  ) {
    return {}
  }
  // Dashboard/analytics fields are overwhelmingly numeric — default to a count.
  return randomInt(rng, 1, 1200)
}

/**
 * Build a single-object success response from a list of field names
 * discovered by the handler scanner (`res.json({ a, b, c })`).
 * @param fields
 * @param appType
 * @param path
 */
function synthesizeSingleObject(
  fields: string[],
  appType: string,
  path: string,
): Record<string, unknown> {
  const rng = createSeededRandom(seedFromPath(appType, path))
  const obj: Record<string, unknown> = {}
  fields.forEach((f, i) => {
    obj[f] = generateFieldValue(f, rng, i)
  })
  return obj
}

/* ================================================================== */
/*  Directory-based fixture loading                                    */
/* ================================================================== */

/**
 * Load an AppDataPool from a directory of JSON fixture files.
 *
 * File naming conventions:
 * - Array files (e.g. `products.json` containing `[...]`) become CRUD resources
 * - Object files (e.g. `reports.json` containing `{key: ...}`) become sub-endpoint groups
 *   where each key maps to a GET endpoint
 *
 * Special filenames are treated as report/sub-endpoint groups (object shape expected):
 *   `reports.json`, `storefront.json`, `admin.json`
 *
 * All other files are treated as array resources by default.
 *
 * @param fixturesDir - Absolute path to the fixtures directory
 * @param appType - App type label (for the returned pool metadata)
 * @returns An AppDataPool, or undefined if the directory doesn't exist or is empty
 */
export function loadFixturesFromDirectory(
  fixturesDir: string,
  appType: string,
): AppDataPool | undefined {
  if (!existsSync(fixturesDir)) return undefined

  const files = readdirSync(fixturesDir).filter((f) => f.endsWith('.json'))
  if (files.length === 0) return undefined

  const resources: Record<string, FixtureRecord[]> = {}
  const reports: Record<string, unknown> = {}

  // Filenames that are always treated as sub-endpoint groups (object with key → data)
  const subEndpointFiles = new Set(['reports', 'storefront', 'admin'])
  // Sub-endpoint files where arrays become CRUD resources (not just GET endpoints)
  const crudSubEndpointFiles = new Set(['admin'])

  for (const file of files) {
    const name = basename(file, '.json')
    const raw = readFileSync(join(fixturesDir, file), 'utf-8')
    const data: unknown = JSON.parse(raw)

    if (Array.isArray(data)) {
      // Array → CRUD resource
      resources[name] = data as FixtureRecord[]
    } else if (typeof data === 'object' && data !== null) {
      if (subEndpointFiles.has(name)) {
        // Known sub-endpoint group: each key becomes a report/custom endpoint or CRUD resource
        for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
          const fullKey = `${name === 'reports' ? '' : name + '/'}${key}`.replace(/^\//, '')
          if (Array.isArray(value) && crudSubEndpointFiles.has(name)) {
            // Array values in CRUD sub-endpoint files → CRUD resources at /api/{name}/{key}
            resources[fullKey] = value as FixtureRecord[]
          } else {
            // Everything else → report-style GET endpoints (including arrays in reports/storefront)
            reports[fullKey] = value
          }
        }
      } else {
        // Unknown object file — wrap as single-record resource array
        resources[name] = [data as FixtureRecord]
      }
    }
  }

  return {
    appType,
    resources,
    reports: Object.keys(reports).length > 0 ? reports : undefined,
  }
}

/* ================================================================== */
/*  Pool cache (keyed by fixturesDir path)                             */
/* ================================================================== */

const poolCache = new Map<string, AppDataPool>()

/**
 * Get an AppDataPool for a fixtures directory, with caching.
 * @param fixturesDir - Absolute path to the fixtures directory
 * @param appType - App type label
 * @returns The loaded pool, or undefined if directory missing/empty
 */
export function getAppDataPool(fixturesDir: string, appType: string): AppDataPool | undefined {
  const cached = poolCache.get(fixturesDir)
  if (cached) return cached

  const pool = loadFixturesFromDirectory(fixturesDir, appType)
  if (pool) poolCache.set(fixturesDir, pool)
  return pool
}

/**
 * Build a complete fixture set for an app type by combining
 * data pool records with endpoint definitions.
 * @param appType - The app type
 * @param endpoints - The discovered endpoints from scanning
 * @param fixturesDir - Path to the fixtures directory
 * @returns A complete fixture set, or undefined if no data available
 */
export function buildFixtureSet(
  appType: string,
  endpoints: EndpointDefinition[],
  fixturesDir?: string,
): AppFixtureSet | undefined {
  if (!fixturesDir) return undefined
  const pool = getAppDataPool(fixturesDir, appType)
  if (!pool) return undefined

  const fixtureMap = new Map<string, EndpointFixture>()

  for (const endpoint of endpoints) {
    const key = `${endpoint.method} ${endpoint.path}`
    const fixture = buildEndpointFixture(endpoint, pool)
    fixtureMap.set(key, fixture)
  }

  return { appType, endpoints: fixtureMap }
}

/**
 * Build fixture data for a single endpoint based on the data pool.
 * @param endpoint
 * @param pool
 */
function buildEndpointFixture(endpoint: EndpointDefinition, pool: AppDataPool): EndpointFixture {
  const { method, path, responseHints } = endpoint
  const resourceName = responseHints.resourceName

  // Check for report endpoints first
  if (pool.reports) {
    // Match report paths like /reports/spending-by-category -> 'spending-by-category'
    const reportMatch = path.match(/\/reports\/(.+)$/)
    if (reportMatch) {
      const reportKey = reportMatch[1]
      if (pool.reports[reportKey]) {
        return {
          endpoint,
          successResponse: pool.reports[reportKey],
          emptyResponse: [],
          errorResponse: { error: 'Internal server error' },
        }
      }
    }

    // Check storefront endpoints
    const storefrontMatch = path.match(/\/storefront\/(.+)$/)
    if (storefrontMatch) {
      const key = storefrontMatch[1]
      const fullKey = `storefront/${key}`
      if (pool.reports[fullKey]) {
        return {
          endpoint,
          successResponse: pool.reports[fullKey],
          emptyResponse: key === 'categories' ? [] : { data: [] },
          errorResponse: { error: 'Internal server error' },
        }
      }
    }
  }

  // Cart endpoint (special shape)
  if (path.endsWith('/cart') && method === 'GET' && pool.reports?.['storefront/cart-summary']) {
    return {
      endpoint,
      successResponse: pool.reports['storefront/cart-summary'],
      emptyResponse: { items: [], subtotal: 0 },
      errorResponse: { error: 'Internal server error' },
    }
  }

  // Single-object endpoints — `res.json({ a, b, c })` with no fixture file
  // (e.g. /analytics/summary, /profile/me). Synthesize a semantic object
  // from the field names the scanner extracted, so dashboard KPI cards and
  // detail panels render real values instead of zeros/empty states.
  if (
    method === 'GET' &&
    responseHints.isSingleObject &&
    responseHints.responseFields &&
    responseHints.responseFields.length > 0
  ) {
    return {
      endpoint,
      successResponse: synthesizeSingleObject(responseHints.responseFields, pool.appType, path),
      emptyResponse: {},
      errorResponse: { error: 'Internal server error' },
    }
  }

  const records = pool.resources[resourceName] ?? pool.resources[resourceName + 's'] ?? []

  if (method === 'GET') {
    if (path.includes(':id') || path.includes(':itemId') || path.includes(':productId')) {
      // Single resource GET
      const item = records[0] ?? {}
      return {
        endpoint,
        successResponse: item,
        emptyResponse: null,
        errorResponse: { error: 'Internal server error' },
      }
    }

    // List GET
    if (responseHints.isPaginated) {
      return {
        endpoint,
        successResponse: { data: records, total: records.length, page: 1, limit: 20 },
        emptyResponse: { data: [], total: 0, page: 1, limit: 20 },
        errorResponse: { error: 'Internal server error' },
      }
    }

    return {
      endpoint,
      successResponse: records,
      emptyResponse: [],
      errorResponse: { error: 'Internal server error' },
    }
  }

  if (method === 'POST') {
    const created = records[0] ?? { id: 'new-id' }
    return {
      endpoint,
      successResponse: created,
      emptyResponse: created,
      errorResponse: { error: 'Internal server error' },
    }
  }

  if (method === 'PUT') {
    const updated = records[0] ?? { id: 'updated-id' }
    return {
      endpoint,
      successResponse: updated,
      emptyResponse: updated,
      errorResponse: { error: 'Internal server error' },
    }
  }

  // DELETE
  return {
    endpoint,
    successResponse: null,
    emptyResponse: null,
    errorResponse: { error: 'Internal server error' },
  }
}

/**
 * Generate fixtures from a directory of JSON files without scanning handlers.
 * Builds standard CRUD endpoints for each resource file and custom endpoints
 * for each sub-endpoint group.
 *
 * @param fixturesDir - Absolute path to the fixtures directory
 * @param appType - App type label (default: derived from directory name)
 * @returns A fixture set with standard CRUD endpoints, or undefined if no data
 */
export function generateFixtures(fixturesDir: string, appType?: string): AppFixtureSet | undefined {
  const resolvedAppType = appType ?? basename(fixturesDir)
  const pool = getAppDataPool(fixturesDir, resolvedAppType)
  if (!pool) return undefined

  const fixtureMap = new Map<string, EndpointFixture>()

  // Generate standard CRUD endpoints for each resource
  for (const [resourceName, records] of Object.entries(pool.resources)) {
    const basePath = `/api/${resourceName}`

    // Cart is special: UI expects { items, subtotal, shipping?, tax?, total? }
    // not a flat list. Synthesize the envelope from line-item records so the
    // existing fixture file (a flat array of cart-line records) drives both
    // the cart and checkout pages without duplication.
    if (resourceName === 'cart') {
      const subtotal = records.reduce((sum, r) => {
        const item = r as Record<string, unknown>
        const qty = typeof item.quantity === 'number' ? item.quantity : 1
        const product = item.product as Record<string, unknown> | undefined
        const price = product && typeof product.price === 'number' ? product.price : 0
        return sum + qty * price
      }, 0)
      const shipping = subtotal > 0 ? 500 : 0
      const tax = Math.round(subtotal * 0.08)
      const total = subtotal + shipping + tax
      const cartEnvelope = { items: records, subtotal, shipping, tax, total }
      const cartEndpoint: EndpointDefinition = {
        method: 'GET',
        path: basePath,
        requiresAuth: true,
        responseHints: {
          isList: false,
          isPaginated: false,
          hasNestedResources: false,
          resourceName,
        },
      }
      fixtureMap.set(`GET ${basePath}`, {
        endpoint: cartEndpoint,
        successResponse: cartEnvelope,
        emptyResponse: { items: [], subtotal: 0, shipping: 0, tax: 0, total: 0 },
        errorResponse: { error: 'Internal server error' },
      })
      // Also expose mutation endpoints (POST add, DELETE clear, POST promo)
      // so the cart page's add/remove/promo flows return reasonable shapes.
      fixtureMap.set(`POST ${basePath}`, {
        endpoint: {
          method: 'POST',
          path: basePath,
          requiresAuth: true,
          responseHints: {
            isList: false,
            isPaginated: false,
            hasNestedResources: false,
            resourceName,
          },
        },
        successResponse: cartEnvelope,
        emptyResponse: cartEnvelope,
        errorResponse: { error: 'Internal server error' },
      })
      fixtureMap.set(`POST ${basePath}/promo`, {
        endpoint: {
          method: 'POST',
          path: `${basePath}/promo`,
          requiresAuth: true,
          responseHints: {
            isList: false,
            isPaginated: false,
            hasNestedResources: false,
            resourceName,
          },
        },
        successResponse: {
          ...cartEnvelope,
          promoApplied: true,
          discount: Math.round(subtotal * 0.1),
        },
        emptyResponse: cartEnvelope,
        errorResponse: { error: 'Invalid promo code' },
      })
      fixtureMap.set(`DELETE ${basePath}/:id`, {
        endpoint: {
          method: 'DELETE',
          path: `${basePath}/:id`,
          requiresAuth: true,
          responseHints: {
            isList: false,
            isPaginated: false,
            hasNestedResources: false,
            resourceName,
          },
        },
        successResponse: { items: [], subtotal: 0, shipping: 0, tax: 0, total: 0 },
        emptyResponse: { items: [], subtotal: 0, shipping: 0, tax: 0, total: 0 },
        errorResponse: { error: 'Internal server error' },
      })
      continue
    }

    // GET list — wrap in a { data, total } envelope to match the real
    // molecule resource handlers (e.g. `res.json({ data: addresses })`).
    // App pages are wired to the real backend's envelope shape; the mock
    // server must mirror it or list pages render empty.
    const listEndpoint: EndpointDefinition = {
      method: 'GET',
      path: basePath,
      requiresAuth: true,
      responseHints: { isList: true, isPaginated: true, hasNestedResources: false, resourceName },
    }
    fixtureMap.set(`GET ${basePath}`, {
      endpoint: listEndpoint,
      successResponse: { data: records, total: records.length },
      emptyResponse: { data: [], total: 0 },
      errorResponse: { error: 'Internal server error' },
    })

    // GET single
    const singleEndpoint: EndpointDefinition = {
      method: 'GET',
      path: `${basePath}/:id`,
      requiresAuth: true,
      responseHints: { isList: false, isPaginated: false, hasNestedResources: false, resourceName },
    }
    fixtureMap.set(`GET ${basePath}/:id`, {
      endpoint: singleEndpoint,
      successResponse: records[0] ?? {},
      emptyResponse: null,
      errorResponse: { error: 'Internal server error' },
    })

    // POST
    const createEndpoint: EndpointDefinition = {
      method: 'POST',
      path: basePath,
      requiresAuth: true,
      responseHints: { isList: false, isPaginated: false, hasNestedResources: false, resourceName },
    }
    fixtureMap.set(`POST ${basePath}`, {
      endpoint: createEndpoint,
      successResponse: records[0] ?? {},
      emptyResponse: records[0] ?? {},
      errorResponse: { error: 'Internal server error' },
    })

    // PUT
    const updateEndpoint: EndpointDefinition = {
      method: 'PUT',
      path: `${basePath}/:id`,
      requiresAuth: true,
      responseHints: { isList: false, isPaginated: false, hasNestedResources: false, resourceName },
    }
    fixtureMap.set(`PUT ${basePath}/:id`, {
      endpoint: updateEndpoint,
      successResponse: records[0] ?? {},
      emptyResponse: records[0] ?? {},
      errorResponse: { error: 'Internal server error' },
    })

    // DELETE
    const deleteEndpoint: EndpointDefinition = {
      method: 'DELETE',
      path: `${basePath}/:id`,
      requiresAuth: true,
      responseHints: { isList: false, isPaginated: false, hasNestedResources: false, resourceName },
    }
    fixtureMap.set(`DELETE ${basePath}/:id`, {
      endpoint: deleteEndpoint,
      successResponse: null,
      emptyResponse: null,
      errorResponse: { error: 'Internal server error' },
    })
  }

  // Add report/custom endpoints
  if (pool.reports) {
    for (const [reportKey, reportData] of Object.entries(pool.reports)) {
      // If key contains '/' it's a custom path (e.g. 'admin/dashboard' -> /api/admin/dashboard)
      // Otherwise it's a report (e.g. 'spending-by-category' -> /api/reports/spending-by-category)
      const reportPath = reportKey.includes('/') ? `/api/${reportKey}` : `/api/reports/${reportKey}`
      const reportEndpoint: EndpointDefinition = {
        method: 'GET',
        path: reportPath,
        requiresAuth: true,
        responseHints: {
          isList: false,
          isPaginated: false,
          hasNestedResources: false,
          resourceName: 'reports',
        },
      }
      fixtureMap.set(`GET ${reportPath}`, {
        endpoint: reportEndpoint,
        successResponse: reportData,
        emptyResponse: Array.isArray(reportData) ? [] : {},
        errorResponse: { error: 'Internal server error' },
      })
    }
  }

  return { appType: resolvedAppType, endpoints: fixtureMap }
}
