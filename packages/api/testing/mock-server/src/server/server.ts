/**
 * Express-based mock HTTP server that serves fixture responses.
 * Supports programmatic control of response states and delays.
 */

import express from 'express'
import type { Request, Response } from 'express'
import type { Server } from 'node:http'
import type {
  MockServerConfig,
  MockServer,
  AppFixtureSet,
  EndpointFixture,
  ResponseState,
} from '../types.js'
import { scanHandlers, resolveHandlersPath } from '../scanner/scanner.js'
import { generateFixtures, buildFixtureSet } from '../fixtures/app-fixtures.js'
import { getStatusCode, getResponseBody } from '../states/states.js'
import {
  stateControlMiddleware,
  corsMiddleware,
  loggingMiddleware,
  applyDelay,
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
    defaultDelay = 0,
    defaultState = 'success',
    endpointStates = {},
    handlersPath,
    customFixtures,
    logging = true,
  } = config

  // Build fixture set
  let fixtures: AppFixtureSet

  if (customFixtures) {
    fixtures = customFixtures
  } else {
    // Try scanning handlers first
    const resolvedPath = handlersPath ?? resolveHandlersPath(appType)
    if (resolvedPath) {
      const scanResult = scanHandlers(resolvedPath, appType)
      const scannedFixtures = buildFixtureSet(appType, scanResult.endpoints)
      if (scannedFixtures) {
        fixtures = scannedFixtures
      } else {
        // Fall back to auto-generated fixtures
        const generated = generateFixtures(appType)
        if (!generated) {
          throw new Error(`No fixture data available for app type: ${appType}. Supported types: personal-finance, online-store`)
        }
        fixtures = generated
      }
    } else {
      // No handler path found, use auto-generated fixtures
      const generated = generateFixtures(appType)
      if (!generated) {
        throw new Error(`No fixture data available for app type: ${appType}. Supported types: personal-finance, online-store`)
      }
      fixtures = generated
    }
  }

  // Per-endpoint state overrides (mutable at runtime)
  const stateOverrides = new Map<string, ResponseState>(
    Object.entries(endpointStates)
  )

  let currentDefaultState: ResponseState = {
    state: defaultState,
    delay: defaultDelay,
  }

  // Create Express app
  const app = express()
  app.use(express.json())
  app.use(corsMiddleware())
  app.use(stateControlMiddleware(currentDefaultState))
  if (logging) {
    app.use(loggingMiddleware())
  }

  // Register routes from fixtures
  for (const [key, fixture] of fixtures.endpoints) {
    registerRoute(app, key, fixture, stateOverrides, () => currentDefaultState)
  }

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', appType, endpoints: fixtures.endpoints.size })
  })

  // Catch-all for unmatched API routes (Express 5 path-to-regexp syntax)
  app.all('/api/{*path}', (req: Request, res: Response) => {
    const state = res.locals.mockState as ResponseState | undefined
    if (state?.state === 'error') {
      res.status(500).json({ error: 'Internal server error' })
      return
    }
    if (state?.state === 'unauthorized') {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    // Return empty success for unmatched routes
    if (req.method === 'GET') {
      res.json([])
    } else if (req.method === 'DELETE') {
      res.status(204).end()
    } else {
      res.json({})
    }
  })

  // Start server
  const server = await startServer(app, port)
  const actualPort = (server.address() as { port: number }).port

  if (logging) {
    console.log(`\n  Mock API server running at http://localhost:${actualPort}`)
    console.log(`  App type: ${appType}`)
    console.log(`  Endpoints: ${fixtures.endpoints.size}`)
    console.log(`  Default state: ${defaultState}\n`)
  }

  return {
    port: actualPort,
    appType,
    setState(endpointKey: string, state: ResponseState) {
      stateOverrides.set(endpointKey, state)
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
 * Register an Express route for a fixture endpoint.
 */
function registerRoute(
  app: express.Express,
  key: string,
  fixture: EndpointFixture,
  stateOverrides: Map<string, ResponseState>,
  getDefault: () => ResponseState,
): void {
  const { method, path } = fixture.endpoint

  // Prefix with /api if not already
  const routePath = path.startsWith('/api') ? path : `/api${path}`

  // Convert :paramName to Express param syntax (already correct format)
  // Build both key forms for state override lookup
  const apiKey = key.replace(/ \//, ' /api/').replace(' /api/api/', ' /api/')
  const bareKey = key.replace(/ \/api\//, ' /')

  const handler = async (_req: Request, res: Response): Promise<void> => {
    // Determine effective state: per-endpoint override > per-request > default
    const endpointOverride = stateOverrides.get(key) ?? stateOverrides.get(apiKey) ?? stateOverrides.get(bareKey)
    const requestState = res.locals.mockState as ResponseState | undefined

    let state: ResponseState
    if (endpointOverride) {
      // Per-endpoint override wins, but inherit delay from request if not set
      state = {
        ...requestState,
        ...endpointOverride,
      }
    } else if (requestState) {
      state = requestState
    } else {
      state = getDefault()
    }

    // Apply delay
    await applyDelay(state)

    // Get status code and body
    const statusCode = getStatusCode(state, method)
    const body = getResponseBody(state, method, fixture)

    if (statusCode === 204 || body === null) {
      res.status(statusCode).end()
      return
    }

    res.status(statusCode).json(body)
  }

  switch (method) {
    case 'GET':
      app.get(routePath, handler)
      break
    case 'POST':
      app.post(routePath, handler)
      break
    case 'PUT':
      app.put(routePath, handler)
      break
    case 'DELETE':
      app.delete(routePath, handler)
      break
  }
}

/**
 * Start the Express server, with special handling for port 0 (random port).
 */
function startServer(app: express.Express, port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve(server)
    })
    server.on('error', reject)
  })
}
