# @molecule/api-project-archive-external-state-sqlite

Capture and restore a project's SQLite databases for
`@molecule/api-project-archive`.

It dumps to a file and loads the file back. That is the whole package —
`sqlite3 <db> .dump` on the way out, replayed on the way in.

```ts
import { setExternalStateProvider } from '@molecule/api-project-archive'
import { createSqliteExternalStateProvider } from '@molecule/api-project-archive-external-state-sqlite'

setExternalStateProvider(
  createSqliteExternalStateProvider({
    databasePaths: (projectId) => [`/var/lib/app/${projectId}/app.db`],
  }),
)
```

## Type
`provider`

## Installation
```bash
npm install @molecule/api-project-archive-external-state-sqlite @molecule/api-project-archive
```

## API

### Interfaces

#### `SqliteExternalStateConfig`

How this deployment finds a project's SQLite databases.

```typescript
interface SqliteExternalStateConfig {
  /**
   * The filesystem paths of every SQLite database belonging to `projectId`.
   *
   * **This is a DECLARATION, not a search.** An empty array means the project
   * genuinely owns none — and it is the ONLY way to say that. A path that is
   * listed but missing is an ERROR, never an absence: a path template one
   * directory off would otherwise capture nothing, report success, and let the
   * caller destroy the only copy. Nothing else in a deployment reads this
   * setting, so a wrong path has no other symptom.
   *
   * @param projectId - The project being archived or restored.
   * @returns Its database file paths; `[]` when it owns none.
   */
  databasePaths: (projectId: string) => readonly string[] | Promise<readonly string[]>
}
```

### Functions

#### `createSqliteExternalStateProvider(config)`

Create the provider.

```typescript
function createSqliteExternalStateProvider(config: SqliteExternalStateConfig): ProjectExternalStateProvider
```

- `config` — How to find a project's database files.

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
const KIND: "sqlite"
```

## Core Interface
Implements `@molecule/api-project-archive` interface.

## Bond Wiring

Setup function to register this provider with the bond system:

```typescript
import { bond } from '@molecule/api-bond'
import { provider } from '@molecule/api-project-archive-external-state-sqlite'

export function setupProjectArchiveExternalStateSqlite(): void {
  bond('project-archive-external-state', 'sqlite', provider)
}
```

## Injection Notes

### Requirements

Peer dependencies:
- `@molecule/api-project-archive` ^1.0.0

### Environment Variables

- `PROJECT_ARCHIVE_SQLITE_PATH` *(required)* — Project database path template
  - Setup: Filesystem path of each project's SQLite database. MUST contain {projectId} — without it every project resolves to the same file. Not needed if you inject your own locate function.
  - Example: `/var/lib/app/projects/{projectId}/app.db`
- `PROJECT_ARCHIVE_SQLITE_ID` *(optional)* — Database id recorded in the archive — default: `main`
  - Setup: Identifier recorded for the located database and used as its artifact part name. Defaults to "main".
  - Example: `main`

### Runtime Dependencies

- `@molecule/api-project-archive`

**If the database file lives inside the project's source tree and is
committed, you do not need this package** — whatever archives the source tree
already carries it, and capturing it here duplicates the bytes. It exists for a
database kept OUTSIDE the tree, or one the project's `.gitignore` excludes.

**`.dump` rather than a file copy, deliberately.** It reads inside a
transaction, so it is consistent against a live database; copying the file can
catch a checkpoint mid-write, or a `-wal`/`-shm` pair that does not match the
main file. It also emits portable SQL, so a restore does not depend on the page
format of the build that wrote it.

**A configured path with no file is an ERROR, not an absence.** A path template
one directory off would otherwise capture nothing and report success, and the
caller destroys the project on a successful capture. Only an empty
`databasePaths` result declares that a project owns no database.

**`sqlite3` must be on PATH.**
