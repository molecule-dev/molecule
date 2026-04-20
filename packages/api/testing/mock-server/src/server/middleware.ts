/**
 * State control middleware for the mock server.
 * Allows per-request state overrides via query params or headers.
 *
 * Query params: ?_state=error&_delay=2000&_status=500
 * Headers: X-Mock-State: error, X-Mock-Delay: 2000
 */

import type { NextFunction, Request, Response } from 'express'

import type { ResponseState } from '../types.js'

/**
 * Express middleware that extracts state control signals from the request
 * and attaches them to res.locals for the route handler to use.
 * @param defaultState - The default state to use when no override is provided
 * @returns Express middleware function
 */
export function stateControlMiddleware(
  defaultState: ResponseState = { state: 'success' },
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Extract state from query params or headers
    const stateParam = (req.query._state as string) || req.get('X-Mock-State')
    const delayParam = (req.query._delay as string) || req.get('X-Mock-Delay')
    const statusParam = (req.query._status as string) || req.get('X-Mock-Status')

    const state: ResponseState = { ...defaultState }

    if (stateParam) {
      const normalized = stateParam.toLowerCase().trim()
      if (['success', 'empty', 'error', 'unauthorized'].includes(normalized)) {
        state.state = normalized as ResponseState['state']
      }
    }

    if (delayParam) {
      const delay = Number(delayParam)
      if (!isNaN(delay) && delay >= 0) {
        state.delay = delay
      }
    }

    if (statusParam) {
      const status = Number(statusParam)
      if (!isNaN(status) && status >= 100 && status < 600) {
        state.statusCode = status
      }
    }

    // Attach to res.locals for route handlers
    res.locals.mockState = state

    next()
  }
}

/**
 * CORS middleware that sets permissive CORS headers for development.
 * @returns Express middleware function
 */
export function corsMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return (_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH')
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Mock-State, X-Mock-Delay, X-Mock-Status',
    )
    res.setHeader('Access-Control-Max-Age', '86400')

    if (_req.method === 'OPTIONS') {
      res.status(204).end()
      return
    }

    next()
  }
}

/**
 * Request logging middleware for the mock server.
 * @returns Express middleware function
 */
export function loggingMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const state = (_res.locals.mockState as ResponseState)?.state ?? 'success'
    const timestamp = new Date().toISOString().substring(11, 23)
    console.log(`[mock-server ${timestamp}] ${req.method} ${req.path} (state: ${state})`)
    next()
  }
}

/**
 * Apply a delay if specified in the response state.
 * @param state - The response state that may contain a delay
 * @returns A promise that resolves after the delay (or immediately if no delay)
 */
export function applyDelay(state: ResponseState): Promise<void> {
  if (state.delay && state.delay > 0) {
    return new Promise((resolve) => setTimeout(resolve, state.delay))
  }
  return Promise.resolve()
}
