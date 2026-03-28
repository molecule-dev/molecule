import { create as dbCreate, findById, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { ResourceTag, Tag } from '../types.js'

/**
 * Adds a tag to a resource. Expects `tagId` in request body.
 * @param req - The request with `resourceType` and `resourceId` params, `tagId` in body.
 * @param res - The response object.
 */
export async function addTag(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
