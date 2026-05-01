/**
 * Append-only version history resource for molecule.dev.
 *
 * Polymorphic, append-only `versions` table that captures full snapshots of
 * any resource type, plus a shallow diff against the prior version. Routes
 * surface list / read / count / diff / restore — there is no UPDATE or
 * DELETE for individual versions, by design. Restoring a prior version
 * appends a new version whose snapshot equals the target's; the existing
 * rows are never mutated.
 *
 * @module
 * @example
 * ```typescript
 * import { routes, requestHandlerMap, createVersion } from '@molecule/api-resource-version-history'
 *
 * // Wire routes via mlcl inject:
 * //   POST   /:resourceType/:resourceId/versions
 * //   GET    /:resourceType/:resourceId/versions
 * //   GET    /:resourceType/:resourceId/versions/count
 * //   GET    /:resourceType/:resourceId/versions/:version
 * //   GET    /versions/:versionId
 * //   POST   /versions/:versionId/restore
 * //   GET    /versions/:fromVersionId/diff/:toVersionId
 *
 * // Or call the service directly from another resource's update handler:
 * await createVersion({
 *   resourceType: 'document',
 *   resourceId: doc.id,
 *   userId: req.session.userId,
 *   snapshot: doc,
 *   reason: 'autosave',
 * })
 * ```
 */

export * from './authorizers/index.js'
export * from './diff.js'
export * from './handlers/index.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
