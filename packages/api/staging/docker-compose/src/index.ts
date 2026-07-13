/**
 * Docker Compose staging driver for molecule.dev.
 *
 * Manages ephemeral staging environments using Docker Compose.
 * Each feature branch gets isolated API, App, and database containers
 * with unique port allocations and networking.
 *
 * @example
 * ```typescript
 * import { setProvider } from '@molecule/api-staging'
 * import { provider } from '@molecule/api-staging-docker-compose'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * - Requires Docker Compose v2.24+ and BuildKit: the generated compose file
 *   uses long-syntax `env_file` (`required: false` — a project without `.env`
 *   or `.env.staging` must still stage) and a named `additional_contexts`
 *   build context (the generated `nginx.conf` lives in `.molecule/staging/`,
 *   outside the app build context).
 * - Inside the containers the API always listens on port 4000 and Postgres on
 *   5432; the allocated `driverMeta` ports (`apiPort`, `appPort`, `dbPort`)
 *   are HOST-side mappings only. The branch env file
 *   (`.env.staging.<slug>`) intentionally holds the host-side values for
 *   tooling run outside Docker — the compose `environment:` block overrides
 *   `PORT`/`DATABASE_URL` back to the in-container values.
 * - `health()` reports container state (`running`), not HTTP reachability —
 *   a booted-but-crashing app can still need `logs()` to diagnose.
 * - Environments live on the machine that ran `up()` (containers + state are
 *   local) — running this driver on an ephemeral CI runner produces an
 *   environment that dies with the job.
 *
 * @module
 */

// Compose generator
export * from './compose-generator.js'

// Provider exports
export * from './provider.js'
