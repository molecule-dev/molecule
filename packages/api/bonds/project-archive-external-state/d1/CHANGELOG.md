# @molecule/api-project-archive-external-state-d1

## 1.0.2

### Patch Changes

- 97c4918: Add the project-archive external-state bond for Cloudflare D1.

  `@molecule/api-project-archive` destroys the original once a capture verifies,
  so a state-owning provider with no external-state bond is silent, permanent
  data loss — not a missing feature. Adding `@molecule/api-database-d1` created
  exactly that gap, and mlcl's coverage gate failed until this closed it.

  Capture shells out to `wrangler d1 export` for the same reason the Postgres
  bond shells out to `pg_dump`: only the engine that owns the data can produce a
  consistent snapshot with schema, indexes and constraints intact.

  Three refusals that exist because each would otherwise be silent:
  `--remote` is the default (a local export dumps the empty miniflare database
  and would look like a clean, successful capture); a zero-byte export is an
  error, not an empty database (`d1 export` always emits schema); and
  `databaseNames` must return an array — anything else is rejected rather than
  read as "this project owns nothing".
