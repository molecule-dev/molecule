# @molecule/api-staging-docker-compose

Docker Compose staging driver for molecule.dev.

Manages ephemeral staging environments using Docker Compose.
Each feature branch gets isolated API, App, and database containers
with unique port allocations and networking.

## Quick Start

```typescript
import { setProvider } from '@molecule/api-staging'
import { provider } from '@molecule/api-staging-docker-compose'

setProvider(provider)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-staging-docker-compose @molecule/api-staging
```

## API

### Interfaces

#### `ComposeContainerStatus`

A single service row parsed from `docker compose ps --format json`.

```typescript
interface ComposeContainerStatus {
  Service: string
  State: string
  Health: string
}
```

#### `ComposeGeneratorConfig`

Configuration for Docker Compose file generation.

```typescript
interface ComposeGeneratorConfig {
  /** Allocated API port on the host. */
  apiPort: number

  /** Allocated App port on the host. */
  appPort: number

  /** Allocated database port on the host. */
  dbPort: number

  /** Relative path from compose file to the API project root. */
  apiContext?: string

  /** Relative path from compose file to the App project root. */
  appContext?: string

  /** Path to generated Dockerfiles directory, relative to the compose file. */
  dockerfilePath?: string
}
```

### Functions

#### `containerStatus(container)`

Returns the human-readable status for a parsed `docker compose ps`
container row — the `Health` value when a healthcheck is defined,
otherwise the raw container `State`, or `'not found'` when the service
isn't running at all.

```typescript
function containerStatus(container?: ComposeContainerStatus): string
```

- `container` — The parsed container row, or `undefined` if the service wasn't found.

**Returns:** The status string.

#### `fallbackPort(base, slug, range)`

Deterministically derives a fallback host port from an environment slug so
that TWO environments falling back to this path (no `driverMeta` — direct
provider callers only; `mlcl stage up` always allocates real ports via
`allocatePort()`) don't collide on the SAME fixed port. Uses FNV-1a, a
stable, dependency-free 32-bit hash — the same slug always maps to the same
port across repeated `up()` calls, so redeploying an existing slug doesn't
relocate it.

```typescript
function fallbackPort(base: number, slug: string, range?: number): number
```

- `base` — The base port for this role (api/app/db).
- `slug` — The environment slug to derive an offset from.
- `range` — Width of the offset window (default 100 — kept narrow enough that api/app/db's offset windows never overlap each other).

**Returns:** `base` plus a slug-derived offset in `[0, range)`.

#### `generateApiDockerfile()`

Generates a multi-stage Dockerfile for the API server.

Stage 1 (build): installs all deps, compiles TypeScript.
Stage 2 (runtime): copies compiled output, installs production deps only.

```typescript
function generateApiDockerfile(): string
```

**Returns:** Dockerfile content as a string.

#### `generateAppDockerfile(envVars)`

Generates a multi-stage Dockerfile for the frontend app.

Stage 1 (build): installs deps, injects Vite env vars via Docker ARG,
then runs the Vite build. ARG → ENV ensures \`process.env.VITE_*\` is
available to Vite at build time (takes precedence over .env files).

Stage 2 (serve): copies built static assets into Nginx. The nginx.conf is
copied from the \`staging\` named build context (the \`.molecule/staging/\`
directory, wired via \`additional_contexts\` in the generated compose file) —
NOT from the app build context: the app project has no nginx.conf of its
own, so a plain \`COPY nginx.conf\` would fail every build with
"not found in build context".

```typescript
function generateAppDockerfile(envVars?: Record<string, string>): string
```

- `envVars` — Build-time environment variables to inject (e.g. \`{ VITE_API_URL: '...' }\`).

**Returns:** Dockerfile content as a string.

#### `generateComposeFile(env, config)`

Generates a Docker Compose YAML string for a staging environment.

The API service uses runtime env_file layering (Node.js reads process.env).
The App service uses Docker build args for VITE_* variables (Vite inlines
them at build time; runtime env vars have no effect on the served bundle).

Requires Docker Compose v2.24+ (long-syntax `env_file` with `required:
false` — the base `.env` / `.env.staging` layers are OPTIONAL; short syntax
hard-fails `up` on any project that doesn't have both files) and BuildKit
(`additional_contexts`, which lets the app image copy the generated
`nginx.conf` from the staging directory — it is NOT inside the app build
context).

The `api` and `app` services each define a `healthcheck:` (previously only
`db` did) so `health()` can read the real `Health` field from `docker
compose ps` instead of treating container `State === 'running'` as
healthy — a process that is up but never came up serving (or is
crash-looping between polls) used to read as a fully healthy environment.
`api`'s probe hits the `/health` route every molecule-scaffolded API
server exposes (`server.ts` — this driver already assumes that shape via
the hardcoded `node dist/server.js` Dockerfile CMD); `app`'s probe hits the
Nginx root, which always serves the built `index.html`.

```typescript
function generateComposeFile(env: StagingEnvironment, config: ComposeGeneratorConfig): string
```

- `env` — The staging environment descriptor.
- `config` — Port and path configuration.

**Returns:** A Docker Compose YAML string.

#### `generateNginxConf()`

Generates an SPA-compatible Nginx configuration.

Uses \`try_files\` to serve \`index.html\` for all routes, which is
required for client-side routing (React Router, Vue Router, etc.).

```typescript
function generateNginxConf(): string
```

**Returns:** Nginx config content as a string.

#### `isComposeVersionSufficient(version)`

Checks a parsed Compose version against {@link REQUIRED_COMPOSE_VERSION}.

```typescript
function isComposeVersionSufficient(version: { major: number; minor: number; }): boolean
```

- `version` — A parsed `{ major, minor }` version.

**Returns:** `true` if the version meets or exceeds the minimum this driver requires.

#### `isContainerHealthy(container)`

Determines whether a parsed `docker compose ps` container row counts as
healthy. `generateComposeFile()` now defines a `healthcheck:` for the `api`
AND `app` services (it always did for `db`), so `Health` is populated for
both — `State === 'running'` alone used to be treated as healthy, which is
also true of a process that is up but never came up serving (or is
crash-looping between polls). Falls back to `State === 'running'` only for
a container with NO healthcheck (an environment staged with a compose file
generated before this fix, or a hand-edited one) — an empty `Health`
string is how `docker compose ps` reports "no healthcheck defined".

```typescript
function isContainerHealthy(container?: ComposeContainerStatus): boolean
```

- `container` — The parsed container row, or `undefined` if the service wasn't found.

**Returns:** `true` if the container is healthy.

#### `parseComposeVersion(output)`

Parses a major.minor pair out of `docker compose version` output (e.g.
`'Docker Compose version v2.24.5'` or the bare `'2.24.5'` from `--short`).
Exported for testing — no need to shell out to `docker` to verify the
parsing logic against every version-string shape Compose has printed.

```typescript
function parseComposeVersion(output: string): { major: number; minor: number; } | null
```

- `output` — Raw stdout from `docker compose version`.

**Returns:** The parsed `{ major, minor }`, or `null` if no version substring is found.

### Constants

#### `provider`

Docker Compose staging driver implementation.

```typescript
const provider: StagingDriver
```

## Core Interface
Implements `@molecule/api-staging` interface.

## Bond Wiring

Setup function to register this provider with the core interface:

```typescript
import { setProvider } from '@molecule/api-staging'
import { provider } from '@molecule/api-staging-docker-compose'

export function setupStagingDockerCompose(): void {
  setProvider(provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-staging` ^1.0.0

### Runtime Dependencies

- `@molecule/api-staging`

- Requires Docker Compose v2.24+ and BuildKit: the generated compose file
  uses long-syntax `env_file` (`required: false` — a project without `.env`
  or `.env.staging` must still stage) and a named `additional_contexts`
  build context (the generated `nginx.conf` lives in `.molecule/staging/`,
  outside the app build context). `checkPrerequisites()` parses `docker
  compose version` and names `'docker-compose >= 2.24 (found X.Y)'` in
  `missing` when the installed engine predates this — before `up()` hits
  the engine's opaque compose parse error.
- Inside the containers the API always listens on port 4000 and Postgres on
  5432; the allocated `driverMeta` ports (`apiPort`, `appPort`, `dbPort`)
  are HOST-side mappings only. The branch env file
  (`.env.staging.<slug>`) intentionally holds the host-side values for
  tooling run outside Docker — the compose `environment:` block overrides
  `PORT`/`DATABASE_URL` back to the in-container values.
- When `env.driverMeta` has no port overrides (direct provider callers
  only — `mlcl stage up` always allocates real ports via `allocatePort()`),
  `up()` derives `apiPort`/`appPort`/`dbPort` deterministically from
  `env.slug` (`fallbackPort()`) instead of three fixed ports, so two
  concurrently-staged slugs don't collide on identical ports.
- `health()` reads the REAL `Health` field from `docker compose ps` for the
  `api` and `app` services (both now define a `healthcheck:` hitting
  `/health` and `/` respectively) — a booted-but-not-yet-serving or
  crash-looping container no longer reads as healthy just because its
  process state is `running`. `logs()` still needs a look for WHY an
  unhealthy service is unhealthy.
- `logs({ follow: true })` throws — this provider returns a single
  `Promise<EnvironmentLogs>` snapshot, not a stream, so `follow` cannot be
  honored; it is rejected explicitly instead of silently returning a
  static tail.
- Environments live on the machine that ran `up()` (containers + state are
  local) — running this driver on an ephemeral CI runner produces an
  environment that dies with the job.
