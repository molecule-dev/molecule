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
 * @param defaultState - The default state to use when no override is provided.
 *   Pass a function to have the default resolved per-request (a live getter) —
 *   required for `MockServer.setDefaultState()` to take effect after startup,
 *   since a plain object is captured once at middleware-creation time.
 * @returns Express middleware function
 */
export function stateControlMiddleware(
  defaultState: ResponseState | (() => ResponseState) = { state: 'success' },
): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    // A repeated query param (?_state=a&_state=b) parses as an array — only
    // accept plain strings so a malformed URL can't crash the middleware.
    const queryString = (name: string): string | undefined => {
      const value = req.query[name]
      return typeof value === 'string' ? value : undefined
    }

    // Extract state from query params or headers
    const stateParam = queryString('_state') || req.get('X-Mock-State')
    const delayParam = queryString('_delay') || req.get('X-Mock-Delay')
    const statusParam = queryString('_status') || req.get('X-Mock-Status')

    const base = typeof defaultState === 'function' ? defaultState() : defaultState
    const state: ResponseState = { ...base }

    if (stateParam) {
      const normalized = stateParam.toLowerCase().trim()
      if (['success', 'empty', 'error', 'unauthorized'].includes(normalized)) {
        state.state = normalized as ResponseState['state']
      } else {
        // A typo'd ?_state (e.g. `?_state=eror`) would otherwise silently serve
        // the DEFAULT state — indistinguishable from the override never having
        // been sent, which reads as "the mock ignores my state control". Label
        // the response so a caller can tell "invalid state value" apart from
        // "state applied".
        res.setHeader('X-Mock-Invalid-State', stateParam)
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
 * Maximum delay, in ms, that {@link applyDelay} will actually wait — a
 * requested delay above this is clamped (and logged) rather than honored
 * verbatim. Guards against a stray oversized `?_delay` / `X-Mock-Delay` /
 * `defaultDelay` / `setState({ delay })` value (e.g. a units mistake
 * applying `*1000` twice) hanging a request until the CLIENT gives up —
 * which in an E2E harness presents as an inexplicable page timeout rather
 * than an obvious mock misconfiguration.
 */
export const MAX_MOCK_DELAY_MS = 60_000

/**
 * Apply a delay if specified in the response state. The requested delay is
 * capped at {@link MAX_MOCK_DELAY_MS} — a value above the cap is clamped and
 * a warning is logged (via `console.warn`, immediately, before waiting —
 * not after — so the clamp is visible in server logs right when the
 * oversized delay is requested rather than a minute later).
 * @param state - The response state that may contain a delay
 * @returns A promise that resolves after the (possibly clamped) delay, or
 *   immediately if no delay was requested
 */
export function applyDelay(state: ResponseState): Promise<void> {
  const requested = state.delay
  if (!requested || requested <= 0) {
    return Promise.resolve()
  }

  const delay = Math.min(requested, MAX_MOCK_DELAY_MS)
  if (delay !== requested) {
    console.warn(
      `[mock-server] requested delay ${requested}ms exceeds the ${MAX_MOCK_DELAY_MS}ms cap — ` +
        `clamping to ${delay}ms. Check for a units mistake (e.g. seconds*1000 applied twice) ` +
        `in ?_delay / X-Mock-Delay / defaultDelay / setState({ delay }).`,
    )
  }

  return new Promise((resolve) => setTimeout(resolve, delay))
}
