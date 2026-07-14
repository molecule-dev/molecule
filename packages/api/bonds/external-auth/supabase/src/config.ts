import { state } from './state.js'
import type { SupabaseSettings } from './types.js'

/**
 * Explicitly sets (part of) the Supabase connection settings, overriding the
 * corresponding environment-variable fallbacks.
 *
 * Merges with any previously configured settings, so it can be called with
 * just the piece that changed (e.g. only `serviceRoleKey` once the user
 * connects it). Invalidates the cached client singletons so the next
 * `getAnonClient()` / `getServiceClient()` call reflects the new settings.
 * Use `resetSupabase()` for a full clean slate.
 */
export const configureSupabase = (settings: SupabaseSettings): void => {
  state.settings = { ...state.settings, ...settings }
  state.anonClient = null
  state.serviceClient = null
}
