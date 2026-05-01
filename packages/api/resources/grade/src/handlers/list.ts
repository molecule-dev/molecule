import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Grade } from '../types.js'

/**
 * Lists grades with pagination and optional `enrollmentId`, `userId`,
 * `courseId`, or `assignmentId` filters.
 *
 * @param req - The request with optional `page`, `perPage`, and filter query params.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage as string, 10) || 20))
  const enrollmentId = req.query.enrollmentId as string | undefined
  const userId = req.query.userId as string | undefined
  const courseId = req.query.courseId as string | undefined
  const assignmentId = req.query.assignmentId as string | undefined

  const where: WhereCondition[] = []
  if (enrollmentId) where.push({ field: 'enrollmentId', operator: '=', value: enrollmentId })
  if (userId) where.push({ field: 'userId', operator: '=', value: userId })
  if (courseId) where.push({ field: 'courseId', operator: '=', value: courseId })
  if (assignmentId) where.push({ field: 'assignmentId', operator: '=', value: assignmentId })

  try {
    const grades = await findMany<Grade>('grades', {
      where,
      orderBy: [{ field: 'postedAt', direction: 'desc' }],
      limit: perPage,
      offset: (page - 1) * perPage,
    })

    res.json({ data: grades, page, perPage })
  } catch (error) {
    logger.error('Failed to list grades', { error })
    res.status(500).json({
      error: t('grade.error.listFailed', undefined, {
        defaultValue: 'Failed to list grades',
      }),
      errorKey: 'grade.error.listFailed',
    })
  }
}
