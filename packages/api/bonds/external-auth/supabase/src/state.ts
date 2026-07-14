/**
 * INTERNAL shared state for the Supabase integration — deliberately NOT
 * re-exported from the package barrel (`src/index.ts`), so none of this leaks
 * into the public API. Holds the configured settings, the lazily created
 * client singletons, and the env-fallback resolution.
 */
import type { SupabaseClient } from '@supabase/supabase-js'

import type { SupabaseSettings } from './types.js'

/**
 * Mutable module state: explicit settings plus the cached client singletons.
 */
export interface SupabaseState {
  /**
   * Settings supplied via `configureSupabase()`. Take precedence over env.
   */
  settings: SupabaseSettings

  /**
   * Cached anon-key client (lazy singleton).
   */
  anonClient: SupabaseClient | null

  /**
   * Cached service-role client (lazy singleton).
   */
  serviceClient: SupabaseClient | null
}

/**
 * The single shared state instance.
 */
export const state: SupabaseState = {
  settings: {},
  anonClient: null,
  serviceClient: null,
}

/**
 * Resolves the effective settings: explicit `configureSupabase()` values
 * first, then environment variables. Called lazily at first client creation
 * (and by `hasServiceRole()`), never at module load — so env vars set after
 * import are picked up.
 */
export const resolveSettings = (): SupabaseSettings => {
  const env = process.env
  return {
    url: state.settings.url ?? env.SUPABASE_URL ?? env.VITE_SUPABASE_URL,
    anonKey:
      state.settings.anonKey ??
      env.SUPABASE_ANON_KEY ??
      env.VITE_SUPABASE_ANON_KEY ??
      env.VITE_SUPABASE_PUBLISHABLE_KEY,
    serviceRoleKey: state.settings.serviceRoleKey ?? env.SUPABASE_SERVICE_ROLE_KEY,
  }
}
