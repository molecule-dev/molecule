import { deleteMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isTagWriteAuthorized } from '../registry.js'

/**
 * Removes a tag from a resource.
 *
 * Requires an authenticated session and rejects an unauthenticated caller (401)
 * before mutating `resource_tags` — fail-closed defense-in-depth that does not
 * depend on the `authenticate` route middleware being wired. Detaching a tag is
 * governed by the owner of the *target* resource, but that ownership lives in the
 * resource's own package (project/product/…) and is not visible here — this
 * package has no generic cross-resource ownership check — so the gate enforced in
 * this handler is "must be authenticated"; per-resource owner authorization is the
 * responsibility of the resource that mounts this route.
 *
 * @param req - The request with `resourceType`, `resourceId`, and `tagId` params.
 * @param res - The response object.
 */
export async function removeTag(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { resourceType, resourceId, tagId } = req.params

  // [M6-1] Fail-closed cross-resource ownership gate: deny (404, no existence
  // leak) unless the parent resource registered an ownership resolver authorizing
  // this caller. Without this, removeTag behind only `authenticate` is a
  // cross-tenant IDOR (strip another tenant's tags) plus a 204/404 existence
  // oracle. Runs before the delete so the uniform 404 reveals nothing.
  if (!(await isTagWriteAuthorized({ resourceType, resourceId, userId }))) {
    // Reuse the generic 'tag.error.notFound' (uniform 404) so the denial leaks
    // nothing — and closes the prior 204/404 association-existence oracle.
    res.status(404).json({
      error: t('tag.error.notFound', undefined, { defaultValue: 'Tag not found' }),
      errorKey: 'tag.error.notFound',
    })
    return
  }

  try {
    const result = await deleteMany('resource_tags', [
      { field: 'tagId', operator: '=', value: tagId },
      { field: 'resourceType', operator: '=', value: resourceType },
      { field: 'resourceId', operator: '=', value: resourceId },
    ])

    if (result.affected === 0) {
      res.status(404).json({
        error: t('tag.error.associationNotFound', undefined, {
          defaultValue: 'Tag association not found',
        }),
        errorKey: 'tag.error.associationNotFound',
      })
      return
    }

    logger.debug('Tag removed from resource', { tagId, resourceType, resourceId })
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to remove tag from resource', { tagId, resourceType, resourceId, error })
    res.status(500).json({
      error: t('tag.error.removeFailed', undefined, {
        defaultValue: 'Failed to remove tag from resource',
      }),
      errorKey: 'tag.error.removeFailed',
    })
  }
}
