import { query } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

/**
 * Returns the most popular tags ordered by usage count.
 * @param req - The request object. Optional query param `limit` (default 20, max 100).
 * @param res - The response object.
 */
export async function popular(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100)

  try {
    const result = await query<{
      id: string
      name: string
      slug: string
      color: string | null
      count: string
    }>(
      `SELECT t."id", t."name", t."slug", t."color", COUNT(rt."id")::text AS "count"
       FROM "tags" t
       LEFT JOIN "resource_tags" rt ON rt."tagId" = t."id"
       GROUP BY t."id", t."name", t."slug", t."color"
       ORDER BY COUNT(rt."id") DESC, t."name" ASC
       LIMIT $1`,
      [limit],
    )

    res.json(result.rows.map((row) => ({ ...row, count: Number(row.count) })))
  } catch (error) {
    logger.error('Failed to fetch popular tags', { error })
    res.status(500).json({
      error: t('tag.error.popularFailed', undefined, {
        defaultValue: 'Failed to fetch popular tags',
      }),
      errorKey: 'tag.error.popularFailed',
    })
  }
}
