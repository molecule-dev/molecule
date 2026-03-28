import { deleteMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

/**
 * Removes a tag from a resource.
 * @param req - The request with `resourceType`, `resourceId`, and `tagId` params.
 * @param res - The response object.
 */
export async function removeTag(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const { resourceType, resourceId, tagId } = req.params

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
