import { create as dbCreate, findById, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { ResourceTag, Tag } from '../types.js'

/**
 * Adds a tag to a resource. Expects `tagId` in request body.
 *
 * Requires an authenticated session and rejects an unauthenticated caller (401)
 * before reading or mutating `resource_tags` — fail-closed defense-in-depth that
 * does not depend on the `authenticate` route middleware being wired. Attaching a
 * tag is governed by the owner of the *target* resource, but that ownership lives
 * in the resource's own package (project/product/…) and is not visible here — this
 * package has no generic cross-resource ownership check — so the gate enforced in
 * this handler is "must be authenticated"; per-resource owner authorization is the
 * responsibility of the resource that mounts this route.
 *
 * @param req - The request with `resourceType` and `resourceId` params, `tagId` in body.
 * @param res - The response object.
 */
export async function addTag(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { resourceType, resourceId } = req.params
  const { tagId } = req.body as { tagId?: string }

  if (!tagId) {
    res.status(400).json({
      error: t('tag.error.tagIdRequired', undefined, { defaultValue: 'tagId is required' }),
      errorKey: 'tag.error.tagIdRequired',
    })
    return
  }

  const tag = await findById<Tag>('tags', tagId)
  if (!tag) {
    res.status(404).json({
      error: t('tag.error.notFound', undefined, { defaultValue: 'Tag not found' }),
      errorKey: 'tag.error.notFound',
    })
    return
  }

  const existing = await findOne<ResourceTag>('resource_tags', [
    { field: 'tagId', operator: '=', value: tagId },
    { field: 'resourceType', operator: '=', value: resourceType },
    { field: 'resourceId', operator: '=', value: resourceId },
  ])

  if (existing) {
    res.json(existing)
    return
  }

  try {
    const result = await dbCreate<ResourceTag>('resource_tags', {
      tagId,
      resourceType,
      resourceId,
    })

    logger.debug('Tag added to resource', { tagId, resourceType, resourceId })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('Failed to add tag to resource', { tagId, resourceType, resourceId, error })
    res.status(500).json({
      error: t('tag.error.addFailed', undefined, {
        defaultValue: 'Failed to add tag to resource',
      }),
      errorKey: 'tag.error.addFailed',
    })
  }
}
