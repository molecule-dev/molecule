/**
 * Fixture loading from JSON files in a directory.
 * Each JSON file becomes a resource or endpoint group.
 * No hardcoded app-specific data — all data lives in template fixture directories.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, basename } from 'node:path'
import type {
  AppDataPool,
  AppFixtureSet,
  EndpointDefinition,
  EndpointFixture,
  FixtureRecord,
} from '../types.js'

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

  const files = readdirSync(fixturesDir).filter(f => f.endsWith('.json'))
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
export function getAppDataPool(
  fixturesDir: string,
  appType: string,
): AppDataPool | undefined {
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
 */
function buildEndpointFixture(
  endpoint: EndpointDefinition,
  pool: AppDataPool,
): EndpointFixture {
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
export function generateFixtures(
  fixturesDir: string,
  appType?: string,
): AppFixtureSet | undefined {
  const resolvedAppType = appType ?? basename(fixturesDir)
  const pool = getAppDataPool(fixturesDir, resolvedAppType)
  if (!pool) return undefined

  const fixtureMap = new Map<string, EndpointFixture>()

  // Generate standard CRUD endpoints for each resource
  for (const [resourceName, records] of Object.entries(pool.resources)) {
    const basePath = `/api/${resourceName}`

    // GET list
    const listEndpoint: EndpointDefinition = {
      method: 'GET',
      path: basePath,
      requiresAuth: true,
      responseHints: { isList: true, isPaginated: false, hasNestedResources: false, resourceName },
    }
    fixtureMap.set(`GET ${basePath}`, {
      endpoint: listEndpoint,
      successResponse: records,
      emptyResponse: [],
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
        responseHints: { isList: false, isPaginated: false, hasNestedResources: false, resourceName: 'reports' },
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
