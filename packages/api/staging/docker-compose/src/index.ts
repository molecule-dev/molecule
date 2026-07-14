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
 *   outside the app build context). `checkPrerequisites()` parses `docker
 *   compose version` and names `'docker-compose >= 2.24 (found X.Y)'` in
 *   `missing` when the installed engine predates this — before `up()` hits
 *   the engine's opaque compose parse error.
 * - Inside the containers the API always listens on port 4000 and Postgres on
 *   5432; the allocated `driverMeta` ports (`apiPort`, `appPort`, `dbPort`)
 *   are HOST-side mappings only. The branch env file
 *   (`.env.staging.<slug>`) intentionally holds the host-side values for
 *   tooling run outside Docker — the compose `environment:` block overrides
 *   `PORT`/`DATABASE_URL` back to the in-container values.
 * - When `env.driverMeta` has no port overrides (direct provider callers
 *   only — `mlcl stage up` always allocates real ports via `allocatePort()`),
 *   `up()` derives `apiPort`/`appPort`/`dbPort` deterministically from
 *   `env.slug` (`fallbackPort()`) instead of three fixed ports, so two
 *   concurrently-staged slugs don't collide on identical ports.
 * - `health()` reads the REAL `Health` field from `docker compose ps` for the
 *   `api` and `app` services (both now define a `healthcheck:` hitting
 *   `/health` and `/` respectively) — a booted-but-not-yet-serving or
 *   crash-looping container no longer reads as healthy just because its
 *   process state is `running`. `logs()` still needs a look for WHY an
 *   unhealthy service is unhealthy.
 * - `logs({ follow: true })` throws — this provider returns a single
 *   `Promise<EnvironmentLogs>` snapshot, not a stream, so `follow` cannot be
 *   honored; it is rejected explicitly instead of silently returning a
 *   static tail.
 * - Environments live on the machine that ran `up()` (containers + state are
 *   local) — running this driver on an ephemeral CI runner produces an
 *   environment that dies with the job.
 *
 * @module
 */

// Compose generator
export * from './browser-guard.js'
export * from './compose-generator.js'

// Provider exports
export * from './provider.js'
