# @molecule/api-project-archive-external-state-postgresql

Capture and restore a project's PostgreSQL databases for
`@molecule/api-project-archive`.

It dumps to a file and loads the file back. That is the whole package —
`pg_dump --format=custom` on the way out, `pg_restore` on the way in.

```ts
import { setExternalStateProvider } from '@molecule/api-project-archive'
import { createPostgresqlExternalStateProvider } from '@molecule/api-project-archive-external-state-postgresql'

setExternalStateProvider(
  createPostgresqlExternalStateProvider({
    // YOUR deployment provisioned these, so it states them. Nothing is discovered.
    databaseUrls: (projectId) => [`postgres://user:pw@db:5432/app_${projectId}`],
  }),
)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-project-archive-external-state-postgresql @molecule/api-project-archive
```

## API

### Interfaces

#### `PostgresqlExternalStateConfig`

How this deployment finds a project's PostgreSQL databases.

```typescript
interface PostgresqlExternalStateConfig {
  /**
   * The connection URLs of every database belonging to `projectId`.
   *
   * **This is a DECLARATION, not a query.** The deployment provisioned these
   * databases, so it knows what they are; this provider never goes looking. An
   * empty array means the project genuinely owns none — and it is the ONLY way
   * to say that.
   *
   * Why it matters: the caller destroys the project once a capture succeeds. An
   * earlier version of this package tried to discover a project's databases by
   * querying the server, and every way of doing that is indistinguishable from a
   * permissions failure — `information_schema` views omit rows the account cannot
   * see, so a missing grant reads exactly like "this project has no database".
   * Discovery was removed rather than hardened.
   *
   * @param projectId - The project being archived or restored.
   * @returns Its database connection URLs; `[]` when it owns none.
   */
  databaseUrls: (projectId: string) => readonly string[] | Promise<readonly string[]>
}
```

### Functions

#### `createPostgresqlExternalStateProvider(config)`

Create the provider.

```typescript
function createPostgresqlExternalStateProvider(config: PostgresqlExternalStateConfig): ProjectExternalStateProvider
```

- `config` — How to find a project's databases.

**Returns:** A provider ready to bond with `setExternalStateProvider`.

#### `dumpToFile(command, args, destPath, env)`

Run `command`, streaming its stdout into `destPath`.

```typescript
function dumpToFile(command: string, args: readonly string[], destPath: string, env?: NodeJS.ProcessEnv): Promise<number>
```

- `command` — The executable, e.g. `pg_dump`.
- `args` — Arguments. Credentials belong in `env`, never here — argv is world-readable in the process list.
- `destPath` — Absolute path the dump is written to.
- `env` — Extra environment for the child (where credentials go).

**Returns:** Bytes written.

#### `parseConnection(url)`

Split a connection URL into a database name and the libpq environment.

Credentials go in the ENVIRONMENT, never in argv — argv is readable by any
process on the host.

```typescript
function parseConnection(url: string): Connection
```

- `url` — A `postgres://…` connection URL.

**Returns:** The database name and the environment for the tools.

#### `restoreFromFile(command, args, srcPath, env)`

Run `command`, streaming `srcPath` into its stdin.

```typescript
function restoreFromFile(command: string, args: readonly string[], srcPath: string, env?: NodeJS.ProcessEnv): Promise<void>
```

- `command` — The executable, e.g. `psql`.
- `args` — Arguments. Credentials belong in `env`.
- `srcPath` — Absolute path of the dump to feed in.
- `env` — Extra environment for the child.

### Constants

#### `KIND`

Recorded on every record this provider produces; routes restores back here.

```typescript
const KIND: "postgresql"
```

## Core Interface
Implements `@molecule/api-project-archive` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { provider } from '@molecule/api-project-archive-external-state-postgresql'

export function setupProjectArchiveExternalStatePostgresql(): void {
  bond('project-archive-external-state', 'postgresql', provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-project-archive` ^1.0.0

### Environment Variables

- `PROJECT_ARCHIVE_POSTGRESQL_URL` *(required)* — PostgreSQL connection URL (archiver)
  - Setup: Connection string for the server holding project databases. Credentials reach pg_dump/pg_restore through the environment, never argv. Not needed if you inject resolveDatabaseUrls instead.
  - Example: `postgresql://archiver:secret@db.internal:5432/postgres`
- `PROJECT_ARCHIVE_POSTGRESQL_DATABASE` *(required)* — Project database name template
  - Setup: Database name for each project. MUST contain {projectId} — without it every project resolves to the same database, so one project's archive would hold another's data.
  - Example: `app_{projectId}`

### Runtime Dependencies

- `@molecule/api-project-archive`

**It never asks the server what a project owns — `databaseUrls` says.** An
earlier version tried to discover databases by querying the server, and there
is no way to do that safely: `information_schema` views omit rows the account
cannot see, so a missing grant is indistinguishable from "this project has no
database". Since the caller DESTROYS the project after a successful capture,
that inference deletes live data. Discovery was removed rather than hardened.
An empty array is the only way to declare a project owns nothing, and a
resolver returning anything that is not an array of URLs is an error.

**`pg_dump` and `pg_restore` must be on PATH**, and their version must match
the server's — a client older than the server refuses the dump. Neither is
bundled; a missing binary throws at capture time naming the tool.

**Credentials travel in the environment, never in argv**, which any process on
the host can read. Pass them in the connection URL; this package moves them to
`PG*` variables for the child.

**`restore` runs `--clean --if-exists`**: it DROPS the objects it is about to
load. It is a restore into a database you expect to be replaced, not a merge.
