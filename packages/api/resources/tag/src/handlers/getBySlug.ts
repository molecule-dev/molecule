import type { WhereCondition } from '@molecule/api-database'
import { findMany, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { ResourceTag, Tag } from '../types.js'

/**
 * Gets all resources associated with a tag by slug.
 * Optionally filters by `resourceType` query parameter.
 * @param req - The request with `slug` param and optional `resourceType` query.
 * @param res - The response object.
 */
export async function getBySlug(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const slug = req.params.slug as string
  const resourceType = req.query.resourceType as string | undefined

  try {
    const tag = await findOne<Tag>('tags', [{ field: 'slug', operator: '=', value: slug }])
    if (!tag) {
      res.status(404).json({
        error: t('tag.error.notFound', undefined, { defaultValue: 'Tag not found' }),
        errorKey: 'tag.error.notFound',
      })
      return
    }

    const where: WhereCondition[] = [{ field: 'tagId', operator: '=', value: tag.id }]
    if (resourceType) {
      where.push({ field: 'resourceType', operator: '=', value: resourceType })
    }

    const resourceTags = await findMany<ResourceTag>('resource_tags', {
      where,
      orderBy: [{ field: 'createdAt', direction: 'desc' }],
    })

    res.json({
      tag,
      resources: resourceTags.map((rt) => ({
        resourceType: rt.resourceType,
        resourceId: rt.resourceId,
        taggedAt: rt.createdAt,
      })),
    })
  } catch (error) {
    logger.error('Failed to get resources by tag slug', { slug, error })
    res.status(500).json({
      error: t('tag.error.getBySlugFailed', undefined, {
        defaultValue: 'Failed to get resources by tag',
      }),
      errorKey: 'tag.error.getBySlugFailed',
    })
  }
}
