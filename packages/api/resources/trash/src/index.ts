/**
 * Polymorphic soft-delete + restore + purge helper for any molecule resource.
 *
 * Captures a snapshot of any resource at trash time, then either restores
 * it (re-creating the parent via a registered callback) or purges it. The
 * same package serves note-taking, document-collaboration, kanban,
 * project-management, wiki, and any other productivity app that needs an
 * undo-friendly delete experience.
 *
 * @module
 * @example
 * ```typescript
 * import {
 *   trashItem,
 *   restoreFromTrash,
 *   registerRestoreCallback,
 *   routes,
 *   requestHandlerMap,
 * } from '@molecule/api-trash'
 *
 * // 1. Soft-delete from a parent resource's `delete` handler:
 * await trashItem({
 *   resourceType: 'document',
 *   resourceId: doc.id,
 *   userId: req.session.userId,
 *   snapshot: doc,
 *   reason: 'user delete',
 *   ttlMs: 30 * 24 * 60 * 60 * 1000, // 30 days
 * })
 *
 * // 2. Register a restore callback at startup so the HTTP `restore`
 * //    route can re-create the parent resource:
 * registerRestoreCallback('document', async (snapshot) => {
 *   await documentService.upsertFromSnapshot(snapshot)
 * })
 *
 * // 3. Wire routes via mlcl inject — surfaces:
 * //   POST   /:resourceType/:resourceId/trash
 * //   GET    /trash
 * //   GET    /trash/count
 * //   GET    /trash/:trashId
 * //   POST   /trash/:trashId/restore
 * //   POST   /trash/:trashId/purge
 * ```
 */

export * from './browser-guard.js'
export * from './authorizers/index.js'
export * from './handlers/index.js'
export * from './registry.js'
export * from './requestHandlerMap.js'
export * from './routes.js'
export * from './service.js'
export * from './types.js'
export * from './validation.js'
