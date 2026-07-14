/**
 * Type definitions for the Supabase external-auth bond.
 *
 * @module
 */

/**
 * Connection settings for the Supabase integration.
 *
 * Every field is optional — anything not set explicitly via
 * {@link configureSupabase} falls back to environment variables, read lazily
 * at first client creation (never at module load):
 *
 * - `url`: `SUPABASE_URL` ?? `VITE_SUPABASE_URL`
 * - `anonKey`: `SUPABASE_ANON_KEY` ?? `VITE_SUPABASE_ANON_KEY` ??
 *   `VITE_SUPABASE_PUBLISHABLE_KEY`
 * - `serviceRoleKey`: `SUPABASE_SERVICE_ROLE_KEY`
 */
export interface SupabaseSettings {
  /**
   * The Supabase project URL (e.g. `https://abcd1234.supabase.co`).
   */
  url?: string

  /**
   * The PUBLIC anon (publishable) key. Safe to expose in browsers — it grants
   * only what Row Level Security allows. Sufficient for verifying user JWTs.
   */
  anonKey?: string

  /**
   * The SECRET service-role key. Bypasses Row Level Security — server-only,
   * never exposed to clients. Not provisioned in molecule sandboxes by
   * default; check {@link hasServiceRole} before relying on it.
   */
  serviceRoleKey?: string
}
