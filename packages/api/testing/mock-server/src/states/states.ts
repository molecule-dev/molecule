/**
 * Configurable response states for the mock server.
 * Provides standard response shapes for success, empty, error, and unauthorized states.
 */

import type { ResponseState, HttpMethod } from '../types.js'

/** Default response states for each scenario */
export const DEFAULT_STATES = {
  success: { state: 'success' as const },
  empty: { state: 'empty' as const },
  error: { state: 'error' as const, statusCode: 500 },
  unauthorized: { state: 'unauthorized' as const, statusCode: 401 },
} as const

/**
 * Get the HTTP status code for a given state and method.
 * @param state - The response state
 * @param method - The HTTP method
 * @returns The appropriate HTTP status code
 */
export function getStatusCode(state: ResponseState, method: HttpMethod): number {
  if (state.statusCode) {
    return state.statusCode
  }

  switch (state.state) {
    case 'success':
      if (method === 'POST') return 201
      if (method === 'DELETE') return 204
      return 200

    case 'empty':
      return 200

    case 'error':
      return 500

    case 'unauthorized':
      return 401

    default:
      return 200
  }
}

/**
 * Get the response body for a given state, using the endpoint fixture data.
 * @param state - The response state
 * @param method - The HTTP method
 * @param fixture - The fixture data containing success, empty, and error responses
 * @returns The response body, or null for 204 responses
 */
export function getResponseBody(
  state: ResponseState,
  method: HttpMethod,
  fixture: {
    successResponse: unknown
    emptyResponse: unknown
    errorResponse: { error: string }
  }
): unknown {
  switch (state.state) {
    case 'success':
      if (method === 'DELETE') return null
      return fixture.successResponse

    case 'empty':
      return fixture.emptyResponse

    case 'error':
      return fixture.errorResponse

    case 'unauthorized':
      return { error: 'Unauthorized' }

    default:
      return fixture.successResponse
  }
}

/**
 * Parse a state string into a ResponseState object.
 * @param stateStr - The state string (e.g. 'success', 'error', 'empty', 'unauthorized')
 * @returns The parsed ResponseState
 */
export function parseState(stateStr: string): ResponseState {
  const normalized = stateStr.toLowerCase().trim()
  switch (normalized) {
    case 'success':
      return DEFAULT_STATES.success
    case 'empty':
      return DEFAULT_STATES.empty
    case 'error':
      return DEFAULT_STATES.error
    case 'unauthorized':
      return DEFAULT_STATES.unauthorized
    default:
      return DEFAULT_STATES.success
  }
}
