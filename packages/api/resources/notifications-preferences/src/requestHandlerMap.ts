/**
 * Maps route handler names to their implementations.
 *
 * @module
 */

import { getPreferencesHandler } from './handlers/get-preferences.js'
import { updatePreferencesHandler } from './handlers/update-preferences.js'

/**
 * Handler map for notification-preferences routes.
 */
export const requestHandlerMap = {
  getPreferences: getPreferencesHandler,
  updatePreferences: updatePreferencesHandler,
} as const
