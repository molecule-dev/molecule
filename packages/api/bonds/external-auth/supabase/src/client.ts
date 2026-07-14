import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import { resolveSettings, state } from './state.js'

/**
 * Server-appropriate client options: no session persistence, no background
 * token refresh, no URL-fragment session detection.
 */
const SERVER_CLIENT_OPTIONS = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
} as const

/**
 * Returns the anon-key Supabase client (lazy singleton). Created on first
 * call from the resolved settings — explicit `configureSupabase()` values
 * first, env fallbacks second (`SUPABASE_URL` ?? `VITE_SUPABASE_URL`, and
 * `SUPABASE_ANON_KEY` ?? `VITE_SUPABASE_ANON_KEY` ??
 * `VITE_SUPABASE_PUBLISHABLE_KEY`).
 *
 * The anon key is PUBLIC — this client requires no secret and is constrained
 * by Row Level Security. Use it for `verifyUserToken()` and for PostgREST
 * reads/writes that RLS already permits.
 *
 * @throws When neither `configureSupabase()` nor the environment provides a
 *   URL + anon key — the error names exactly which env keys are missing.
 */
export const getAnonClient = (): SupabaseClient => {
  if (state.anonClient) return state.anonClient
  const { url, anonKey } = resolveSettings()
  if (!url || !anonKey) {
    const missing = [
      ...(url ? [] : ['SUPABASE_URL (or VITE_SUPABASE_URL)']),
      ...(anonKey
        ? []
        : ['SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY)']),
    ]
    throw new Error(
      `@molecule/api-supabase is not configured: missing ${missing.join(' and ')}. ` +
        'Set the env var(s) in the Environment panel or call configureSupabase({ url, anonKey }).',
    )
  }
  state.anonClient = createClient(url, anonKey, SERVER_CLIENT_OPTIONS)
  return state.anonClient
}

/**
 * Whether a service-role key is available (explicitly configured or via
 * `SUPABASE_SERVICE_ROLE_KEY`). ALWAYS check this before calling
 * `getServiceClient()` — molecule sandboxes do NOT provision the key by
 * default, so admin paths must degrade gracefully or ask the user to
 * connect it.
 */
export const hasServiceRole = (): boolean => Boolean(resolveSettings().serviceRoleKey)

/**
 * Returns the service-role (admin) Supabase client (lazy singleton). Bypasses
 * Row Level Security — server-only, for admin operations the anon client
 * cannot perform.
 *
 * @throws When no service-role key is connected (guard with
 *   `hasServiceRole()`), or when no project URL is configured.
 */
export const getServiceClient = (): SupabaseClient => {
  if (state.serviceClient) return state.serviceClient
  const { url, serviceRoleKey } = resolveSettings()
  if (!serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not connected. Ask the user to add it in the Environment panel — never assume it exists.',
    )
  }
  if (!url) {
    throw new Error(
      '@molecule/api-supabase is not configured: missing SUPABASE_URL (or VITE_SUPABASE_URL). ' +
        'Set the env var in the Environment panel or call configureSupabase({ url }).',
    )
  }
  state.serviceClient = createClient(url, serviceRoleKey, SERVER_CLIENT_OPTIONS)
  return state.serviceClient
}

/**
 * Test hook: clears the cached clients AND any settings set via
 * `configureSupabase()`, returning the module to its pristine state. The next
 * client creation re-reads the environment from scratch.
 */
export const resetSupabase = (): void => {
  state.settings = {}
  state.anonClient = null
  state.serviceClient = null
}
