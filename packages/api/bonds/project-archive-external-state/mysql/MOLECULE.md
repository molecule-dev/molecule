# @molecule/api-project-archive-external-state-mysql

Capture and restore a project's MySQL databases for
`@molecule/api-project-archive`.

It dumps to a file and loads the file back. That is the whole package —
`mysqldump` on the way out, `mysql` on the way in.

```ts
import { setExternalStateProvider } from '@molecule/api-project-archive'
import { createMysqlExternalStateProvider } from '@molecule/api-project-archive-external-state-mysql'

setExternalStateProvider(
  createMysqlExternalStateProvider({
    // YOUR deployment provisioned these, so it states them. Nothing is discovered.
    databaseUrls: (projectId) => [`mysql://user:pw@db:3306/app_${projectId}`],
  }),
)
```

## Type

`provider`

## Installation

```bash
npm install @molecule/api-project-archive-external-state-mysql @molecule/api-project-archive
```

## API

### Interfaces

#### `MysqlExternalStateConfig`

How this deployment finds a project's MySQL databases.

```typescript
interface MysqlExternalStateConfig {
  /**
   * The connection URLs of every database belonging to `projectId`.
   *
   * **This is a DECLARATION, not a query.** The deployment provisioned these
   * databases, so it knows what they are; this provider never goes looking. An
   * empty array means the project genuinely owns none — and it is the ONLY way
   * to say that.
   *
   * Why it matters more here than anywhere: MySQL filters `information_schema`
   * BY PRIVILEGE. An account without a grant on a schema sees zero rows, which
   * is byte-for-byte identical to the schema not existing — and a provisioning
   * race produces exactly that state transiently. An earlier version of this
   * package queried `information_schema.SCHEMATA` and read zero rows as "this
   * project owns no database", which, since the caller destroys the project once
   * a capture succeeds, deleted live databases. There is no query that closes
   * this: `TABLES`, `VIEWS`, `ROUTINES` and `mysqldump`'s own `SHOW TABLES` are
   * filtered by the same privilege. Discovery was removed rather than hardened.
   *
   * @param projectId - The project being archived or restored.
   * @returns Its database connection URLs; `[]` when it owns none.
   */
  databaseUrls: (projectId: string) => readonly string[] | Promise<readonly string[]>
}
```

### Functions

#### `createMysqlExternalStateProvider(config)`

Create the provider.

```typescript
function createMysqlExternalStateProvider(
  config: MysqlExternalStateConfig,
): ProjectExternalStateProvider
```

- `config` — How to find a project's databases.

**Returns:** A provider ready to bond with `setExternalStateProvider`.

#### `dumpToFile(command, args, destPath, env)`

Run `command`, streaming its stdout into `destPath`.

```typescript
function dumpToFile(
  command: string,
  args: readonly string[],
  destPath: string,
  env?: NodeJS.ProcessEnv,
): Promise<number>
```

- `command` — The executable, e.g. `pg_dump`.
- `args` — Arguments. Credentials belong in `env`, never here — argv is world-readable in the process list.
- `destPath` — Absolute path the dump is written to.
- `env` — Extra environment for the child (where credentials go).

**Returns:** Bytes written.

#### `parseConnection(url)`

Split a connection URL into a database name, client options and environment.

The password goes in `MYSQL_PWD`, never in argv — `--password=` is readable by
any process on the host, and the MySQL client warns about exactly this.

```typescript
function parseConnection(url: string): Connection
```

- `url` — A `mysql://…` connection URL.

**Returns:** The database name, the shared client arguments, and the environment.

#### `restoreFromFile(command, args, srcPath, env)`

Run `command`, streaming `srcPath` into its stdin.

```typescript
function restoreFromFile(
  command: string,
  args: readonly string[],
  srcPath: string,
  env?: NodeJS.ProcessEnv,
): Promise<void>
```

- `command` — The executable, e.g. `psql`.
- `args` — Arguments. Credentials belong in `env`.
- `srcPath` — Absolute path of the dump to feed in.
- `env` — Extra environment for the child.

### Constants

#### `KIND`

Recorded on every record this provider produces; routes restores back here.

```typescript
const KIND: 'mysql'
```

## Core Interface

Implements `@molecule/api-project-archive` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { provider } from '@molecule/api-project-archive-external-state-mysql'

export function setupProjectArchiveExternalStateMysql(): void {
  bond('project-archive-external-state', 'mysql', provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:

- `@molecule/api-project-archive` ^1.0.0

### Environment Variables

- `PROJECT_ARCHIVE_MYSQL_URL` _(required)_ — MySQL connection URL (archiver)
  - Setup: Connection string for the server holding project databases. The password is passed through a defaults file, never argv. Not needed if you inject your own connection config.
  - Example: `mysql://archiver:secret@db.internal:3306`
- `PROJECT_ARCHIVE_MYSQL_DATABASE` _(required)_ — Project database name template
  - Setup: Database name for each project. MUST contain {projectId} — without it every project resolves to the same database, so one project's archive would hold another's data.
  - Example: `app_{projectId}`
- `PROJECT_ARCHIVE_MYSQL_DUMP_BIN` _(optional)_ — mysqldump binary — default: `mysqldump`
  - Setup: Path to the mysqldump executable. Set it when the binary is not on PATH or is named differently (for example mariadb-dump).
  - Example: `/usr/bin/mysqldump`
- `PROJECT_ARCHIVE_MYSQL_CLIENT_BIN` _(optional)_ — mysql client binary — default: `mysql`
  - Setup: Path to the mysql client executable used to restore a dump. Set it when the binary is not on PATH or is named differently (for example mariadb).
  - Example: `/usr/bin/mysql`
- `PROJECT_ARCHIVE_MYSQL_MAX_DUMP_BYTES` _(optional)_ — Maximum dump size in bytes — default: `268435456`
  - Setup: Hard cap on a captured dump. A database that exceeds it fails the capture rather than being silently trimmed. Defaults to 256 MiB.
  - Example: `268435456`

### Runtime Dependencies

- `@molecule/api-project-archive`

**It never asks the server what a project owns — `databaseUrls` says.** MySQL
filters `information_schema` BY PRIVILEGE, so an account missing one grant
sees zero rows, identical to the schema not existing — and a provisioning race
produces exactly that transiently. Since the caller DESTROYS the project after
a successful capture, discovering databases that way deletes live data. No
query fixes it (`TABLES`, `VIEWS`, `ROUTINES` and `mysqldump`'s own
`SHOW TABLES` share the privilege), so discovery was removed rather than
hardened.

**The dump includes routines, triggers and events**, none of which
`mysqldump` includes by default — their absence is silent, and a restored
database would simply be missing its stored logic.

**`mysqldump` and `mysql` must be on PATH.** The password travels in
`MYSQL_PWD`, never in argv, which any process on the host can read.

**`restore` replays the dump into an existing database.** It does not create
or drop it; provision the database first.
