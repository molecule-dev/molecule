/**
 * One API resource on the shared query cache. `createQueryResource` is framework-neutral, so it
 * lives in `@molecule/app-query` (with its full documentation); this package re-exports it so
 * Solid pages import it next to `useQuery` and `QueryContent`.
 *
 * @module
 */

export type {
  QueryResource,
  QueryResourceConfig,
  ResourceHttp,
  ResourceResponse,
} from '@molecule/app-query'
export { createQueryResource } from '@molecule/app-query'
