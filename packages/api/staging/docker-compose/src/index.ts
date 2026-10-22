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
 * @example
 * ```typescript
 * import { generateApiDeploymentArtifacts } from '@molecule/api-staging-docker-compose'
 *
 * const files = generateApiDeploymentArtifacts({
 *   runtimeDirectory: 'api',
 *   runtimePaths: ['api', 'app/dist'],
 *   runtimeCommand: ['node', 'dist/server.js'],
 * })
 * // Ordinary Dockerfile/dockerignore/build script; caller owns file writes and hosting.
 * ```
 *
 * @remarks
 * - API artifacts use a patched Node 22 Debian base and build native modules
 *   with Python/make/C++. Install lifecycle scripts run with project source
 *   present; dev dependencies are pruned before built modules move into the
 *   matching, nonroot runtime. No second production install recompiles native
 *   modules without tools. Use the generated dockerignore to exclude host
 *   node_modules and local secrets. For a workspace root, explicitly carry its
 *   server workspace (including manifests/nested dependencies) and frontend
 *   output. Extra system libraries and alternative apt-based images are caller
 *   configuration; native compatibility must be verified on the target platform.
 * - Artifact generation is pure: it starts no container, infers no database or
 *   route and overwrites no project file. The Compose provider uses these files
 *   for its existing separate API/App contexts; other deployment callers can
 *   use the same generator without adopting Compose's service topology.
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
export * from './dockerfile-generator.js'
export * from './types.js'

// Provider exports
export * from './provider.js'
