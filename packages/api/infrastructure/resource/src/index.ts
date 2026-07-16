/**
 * Base resource patterns for molecule.dev.
 *
 * Provides CRUD operation factories and request handler utilities for
 * building RESTful API resources. Every `@molecule/api-resource-*` package
 * (user, project, device, ...) is built on these factories.
 *
 * @example
 * ```typescript
 * import { z } from 'zod'
 *
 * import {
 *   createRequestHandler,
 *   create,
 *   read,
 *   update,
 *   del,
 *   query,
 *   type MoleculeRequest,
 * } from '@molecule/api-resource'
 * import { types } from '@molecule/api-resource'
 * import { basePropsSchema } from '@molecule/api-resource/schema'
 *
 * // Every resource schema extends basePropsSchema (id/createdAt/updatedAt).
 * const userSchema = basePropsSchema.extend({ name: z.string(), email: z.string() })
 * type UserProps = z.infer<typeof userSchema>
 *
 * // Each CRUD factory takes the resource descriptor and returns an async
 * // operation, e.g. ({ props }) or ({ id }) => { statusCode, body }
 * // One descriptor, typed as Resource, drives every CRUD factory:
 * const userResource: types.Resource = { name: 'User', tableName: 'users', schema: userSchema }
 *
 * const createUser = create<UserProps>(userResource)
 * const updateUser = update<UserProps>(userResource)
 * // read/del type their descriptor with the concrete props — cast the shared one:
 * const readUser = read(userResource as types.Resource<UserProps>)
 * const deleteUser = del(userResource as types.Resource<UserProps>)
 *
 * // Operations do NOT take (req, res) directly — adapt each one by mapping
 * // request fields (req.body, req.params.id) to its arguments, then wrap
 * // with createRequestHandler for Express
 * const requestHandlerMap = {
 *   create: createRequestHandler(async (req: MoleculeRequest) =>
 *     await createUser({ props: req.body }),
 *   ),
 *   read: createRequestHandler(async (req: MoleculeRequest) =>
 *     await readUser({ id: req.params.id }),
 *   ),
 *   // ...
 * }
 * ```
 *
 * @remarks
 * Working WITH installed `@molecule/api-resource-*` packages (auth `getUserId`,
 * table ownership, migrations) — what generated code most often breaks:
 *
 * - **Auth inside a handler is `const userId = getUserId(res)`, imported from
 *   `@molecule/api-bonds-default-express`** — NOT from this package (this
 *   package's `utilities` namespace holds only validation helpers). Return 401
 *   when it is missing. There is NO `requireAuth` middleware or file to import
 *   or create; auth is applied at the router level. A route's authorizer may
 *   also stash the already-loaded row on the response context and hand it to
 *   `read({ id, props })` to skip a second database fetch.
 * - **A selected `@molecule/api-resource-*` package OWNS its table AND its
 *   already-wired routes with a FIXED schema** (e.g. `api-resource-project` owns
 *   `projects` keyed by `user_id` with a live `/projects` handler). Do NOT write
 *   a migration that re-creates such a table with a different schema — your
 *   `CREATE TABLE` shadows theirs (or vice-versa) and the package's still-wired
 *   handler then 500s (`column "user_id" does not exist`). To model a different
 *   shape, use a DIFFERENT table name (e.g. `workspace_projects`) + your own
 *   handler. Check `api/migrations/*` + `api/__setup__/` for tables packages
 *   already provide.
 * - **Adding a resource package AFTER scaffold? Copy its migration.** Such a
 *   package ships its table DDL at `node_modules/@molecule/<pkg>/src/__setup__/*.sql`
 *   — copy it into `api/migrations/<next-number>_<name>.sql`. Wiring its
 *   routes/handler alone does NOT create the table: every request 500s with
 *   "relation does not exist" even though the build type-checks clean. (Only
 *   packages present at scaffold time get their migration auto-created.)
 * - **Zod/validation helpers are NAMESPACED exports**, not top-level:
 *   `schema.basePropsSchema` / `schema.validate` / `schema.safeParse` /
 *   `schema.partial` / `schema.pick`, and `utilities.getValidProps`
 *   (re-exported from `@molecule/api-utilities-validation`). Import the
 *   namespace: `import { schema, utilities } from '@molecule/api-resource'`.
 *
 * @module
 */

export * from './browser-guard.js'
export * from './create.js'
export * from './createRequestHandler.js'
export * from './del.js'
export * from './http-types.js'
export * from './i18n.js'
export * from './query.js'
export * from './read.js'
export * from './respond-error.js'
export * as schema from './schema.js'
export * as types from './types.js'
export * from './update.js'
export * as utilities from './utilities/index.js'
