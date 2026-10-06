/**
 * Express-based mock HTTP server that serves fixture responses.
 * Supports programmatic control of response states and delays.
 */

import { existsSync } from 'node:fs'
import type { Server } from 'node:http'
import { join } from 'node:path'

import type { Request, Response } from 'express'
import express from 'express'

import { buildFixtureSet, generateFixtures } from '../fixtures/app-fixtures.js'
import type { FixtureResponse } from '../router/router.js'
import {
  compileFixtureRoutes,
  fixtureResponse,
  matchFixtureRoute,
  unmatchedFixtureResponse,
} from '../router/router.js'
import { resolveHandlersPath, scanHandlers } from '../scanner/scanner.js'
import type { AppFixtureSet, MockServer, MockServerConfig, ResponseState } from '../types.js'
import {
  applyDelay,
  corsMiddleware,
  loggingMiddleware,
  stateControlMiddleware,
} from './middleware.js'

/**
 * Create and start a mock API server for the given app type.
 * The server discovers endpoints by scanning handler templates and
 * serves deterministic fixture data for each discovered route.
 *
 * @param config - Server configuration
 * @returns A running MockServer instance with control methods
 *
 * @example
 * ```typescript
 * const server = await createMockServer({
 *   appType: 'personal-finance',
 *   port: 4000,
 * })
 *
 * // Control state programmatically
 * server.setState('GET /accounts', { state: 'error', statusCode: 500 })
 *
 * // Teardown
 * await server.close()
 * ```
 */
export async function createMockServer(config: MockServerConfig): Promise<MockServer> {
  const {
    appType,
    port = 4000,
    // Bind loopback ONLY by default. This server hands out fixture data with
    // permissive CORS and a `_delay` control — a LAN-wide default bind made
    // both reachable from any peer on the network. Binding beyond loopback
    // (e.g. '0.0.0.0' for a container/VM where the host forwards in) is an
    // explicit opt-in via config.host / --host.
    host = '127.0.0.1',
    defaultDelay = 0,
    defaultState = 'success',
    endpointStates = {},
    logging = true,
  } = config

  const fixtures = buildMockFixtureSet(config)

  // Per-endpoint state overrides (mutable at runtime)
  const stateOverrides = new Map<string, ResponseState>(Object.entries(endpointStates))

  let currentDefaultState: ResponseState = {
    state: defaultState,
    delay: defaultDelay,
  }

  // Create Express app
  const app = express()
  app.use(express.json())
  app.use(corsMiddleware())
  // Pass a getter, not the object: setDefaultState() reassigns
  // currentDefaultState, and a captured object would freeze the default at
  // its startup value (making setDefaultState a silent no-op).
  app.use(stateControlMiddleware(() => currentDefaultState))
  if (logging) {
    app.use(loggingMiddleware())
  }

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', appType, endpoints: fixtures.endpoints.size })
  })

  // Every /api/* request dispatches through the shared fixture router (the
  // same code a static build runs in the browser): static paths before
  // `:param` siblings, so the dir-CRUD `GET /profile/:id` cannot shadow a
  // scanner-discovered `GET /profile/me`.
  const routes = compileFixtureRoutes(fixtures.endpoints.entries())
  app.all('/api/{*path}', async (req: Request, res: Response) => {
    const requestState = res.locals.mockState as ResponseState | undefined
    const match = matchFixtureRoute(routes, req.method, req.path)

    if (!match) {
      // Unmatched routes intentionally return an empty SUCCESS (screenshot/E2E
      // pages must render, not 404) — but that makes a typo'd endpoint look
      // identical to legitimately-empty data. The X-Mock-Unmatched header (and
      // a warn log) lets a caller/debugger tell "no such fixture endpoint"
      // apart from "endpoint exists and its data is empty".
      res.setHeader('X-Mock-Unmatched', 'true')
      if (logging) {
        console.warn(
          `[mock-server] no fixture endpoint matches ${req.method} ${req.path} — serving default empty response (X-Mock-Unmatched: true)`,
        )
      }
      sendFixtureResponse(res, unmatchedFixtureResponse(req.method, requestState))
      return
    }

    const { key, method, fixture } = match.route
    // Effective state: per-endpoint override > per-request > default. An
    // override is looked up under every key form a caller may have used.
    const apiKey = key.replace(/ \//, ' /api/').replace(' /api/api/', ' /api/')
    const bareKey = key.replace(/ \/api\//, ' /')
    const endpointOverride =
      stateOverrides.get(key) ?? stateOverrides.get(apiKey) ?? stateOverrides.get(bareKey)

    let state: ResponseState
    if (endpointOverride) {
      // Per-endpoint override wins, but inherit delay from request if not set
      state = { ...requestState, ...endpointOverride }
    } else if (requestState) {
      state = requestState
    } else {
      state = currentDefaultState
    }

    await applyDelay(state)
    sendFixtureResponse(res, fixtureResponse(fixture, method, state))
  })

  // Start server
  const server = await startServer(app, port, host)
  const actualPort = (server.address() as { port: number }).port

  if (logging) {
    console.log(`\n  Mock API server running at http://${host}:${actualPort}`)
    console.log(`  App type: ${appType}`)
    console.log(`  Endpoints: ${fixtures.endpoints.size}`)
    console.log(`  Default state: ${defaultState}\n`)
  }

  return {
    port: actualPort,
    host,
    appType,
    setState(endpointKey: string, state: ResponseState) {
      stateOverrides.set(endpointKey, state)
    },
    clearState(endpointKey: string) {
      stateOverrides.delete(endpointKey)
    },
    setDefaultState(state: 'success' | 'empty' | 'error' | 'unauthorized') {
      currentDefaultState = { state, delay: defaultDelay }
    },
    getFixtures() {
      return fixtures
    },
    async close() {
      return new Promise<void>((resolve, reject) => {
        server.close((err) => {
          if (err) reject(err)
          else resolve()
        })
      })
    },
  }
}

/**
 * Write a router response to Express: a `null` body (204, or a fixture that
 * is literally `null`) ends the response with no body.
 * @param res - The Express response.
 * @param response - The status + body from the fixture router.
 */
function sendFixtureResponse(res: Response, response: FixtureResponse): void {
  if (response.body === null) {
    res.status(response.status).end()
    return
  }
  res.status(response.status).json(response.body)
}

/**
 * Build the complete fixture set a mock server serves for a config — the
 * directory fixtures (or `customFixtures`), enriched with endpoints the
 * handler scanner discovers that no fixture file covers. Node-only (it reads
 * the filesystem). `createMockServer` serves exactly this set; a static build
 * serializes it with {@link serializeFixtureSet} and answers `fetch` from it
 * in the browser through the same router.
 *
 * @param config - The fixture-related fields of a server config.
 * @returns The fixture set.
 */
export function buildMockFixtureSet(
  config: Pick<
    MockServerConfig,
    'appType' | 'fixturesPath' | 'handlersPath' | 'customFixtures' | 'logging'
  >,
): AppFixtureSet {
  const { appType, fixturesPath, handlersPath, customFixtures, logging = true } = config

  let fixtures: AppFixtureSet

  if (customFixtures) {
    fixtures = customFixtures
  } else {
    // Generate fixtures from directory path or throw
    const resolvedFixturesPath = fixturesPath ?? resolveFixturesPath(appType)
    if (!resolvedFixturesPath) {
      throw new Error(
        `No fixture data available for app type: ${appType}. Pass fixturesPath ` +
          `(a directory of *.json fixture files, e.g. './api/fixtures'). ` +
          `Resolving by appType alone looks up mlcl/templates/apps/${appType}/api/fixtures/ ` +
          `and only works inside the molecule workspace — in a scaffolded project, fixturesPath is required.`,
      )
    }

    const generated = generateFixtures(resolvedFixturesPath, appType)
    if (!generated) {
      throw new Error(
        `No fixture data available at path: ${resolvedFixturesPath} — ` +
          `the directory is missing or contains no *.json fixture files.`,
      )
    }
    fixtures = generated

    // If handler files exist, scan them and merge any endpoints not already covered
    const resolvedHandlersPath = handlersPath ?? resolveHandlersPath(appType)
    if (resolvedHandlersPath) {
      try {
        const scanResult = scanHandlers(resolvedHandlersPath, appType)
        const scanned = buildFixtureSet(appType, scanResult.endpoints, resolvedFixturesPath)
        if (scanned) {
          // Directory fixtures key endpoints as `GET /api/x`; the scanner keys
          // them as `GET /x` (the router.use prefix has no /api). Normalize so
          // the two sets reconcile instead of double-registering.
          const norm = (k: string): string => k.replace(/^(\w+) (?!\/api\/)\//, '$1 /api/')
          const dirKeys = new Set([...fixtures.endpoints.keys()].map(norm))
          for (const [key, fixture] of scanned.endpoints) {
            const nk = norm(key)
            if (!dirKeys.has(nk)) {
              // Scanner-discovered endpoint not covered by a fixture file.
              fixtures.endpoints.set(nk, fixture)
            } else if (fixture.endpoint.responseHints.isPaginated) {
              // Endpoint exists in both: the directory fixture defaults a list
              // GET to a bare array, but the handler actually returns a
              // `{ data, total }` envelope — re-wrap the directory fixture's
              // data so the response shape matches what app pages expect.
              const dir = fixtures.endpoints.get(nk)
              if (dir && Array.isArray(dir.successResponse)) {
                const arr = dir.successResponse as unknown[]
                dir.successResponse = { data: arr, total: arr.length }
                dir.emptyResponse = { data: [], total: 0 }
                dir.endpoint.responseHints.isPaginated = true
              }
            }
          }
        }
      } catch (error) {
        // Scanner enrichment is best-effort: a scan failure must not stop the
        // fixture-file endpoints from serving. But a SILENT failure made an
        // explicitly passed handlersPath look ignored (its endpoints just
        // "missing" with no signal), so surface the reason when logging is on.
        if (logging) {
          console.warn(
            `[mock-server] handler scan failed for ${resolvedHandlersPath} — serving fixture-file endpoints only: ${(error as Error).message}`,
          )
        }
      }
    }
  }

  return fixtures
}

/**
 * Resolve a fixtures directory path from an app type name.
 * Searches standard locations in the mlcl templates directory.
 * @param appType - The app type name
 * @returns The resolved fixtures path, or undefined if not found
 */
function resolveFixturesPath(appType: string): string | undefined {
  const root = findWorkspaceRoot()
  if (!root) return undefined

  const candidate = join(root, 'mlcl', 'templates', 'apps', appType, 'api', 'fixtures')
  if (existsSync(candidate)) return candidate

  return undefined
}

/**
 * Attempt to find the workspace root by walking up from cwd.
 */
function findWorkspaceRoot(): string | undefined {
  let dir = process.cwd()
  for (let i = 0; i < 10; i++) {
    if (existsSync(join(dir, 'mlcl')) && existsSync(join(dir, 'molecule'))) {
      return dir
    }
    const parent = join(dir, '..')
    if (parent === dir) break
    dir = parent
  }
  return undefined
}

/**
 * Start the Express server, with special handling for port 0 (random port).
 * @param app
 * @param port
 * @param host - Network address to bind (default `'127.0.0.1'` — loopback
 *   only; broader binds are the caller's explicit opt-in).
 */
function startServer(app: express.Express, port: number, host: string): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, host, () => {
      resolve(server)
    })
    server.on('error', reject)
  })
}
