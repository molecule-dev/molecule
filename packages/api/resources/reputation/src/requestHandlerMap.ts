/**
 * Maps reputation route handler names to their implementations.
 *
 * @module
 */

import { getBadges } from './handlers/getBadges.js'
import { getReputation } from './handlers/getReputation.js'

/**
 * Handler map for reputation routes (`getReputation`, `getBadges`).
 */
export const requestHandlerMap = {
  getReputation,
  getBadges,
} as const
