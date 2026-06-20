import type { WhereCondition } from '@molecule/api-database'
import { findMany } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isGradeAdmin } from '../authorizers/index.js'
import type { Grade } from '../types.js'

/**
 * Lists grades with pagination and optional `enrollmentId`, `userId`,
 * `courseId`, or `assignmentId` filters.
 *
 * Fail-closed authorization (defense-in-depth, independent of the route
 * middleware): rejects an anonymous caller (401). A non-admin caller is force-
 * scoped to their OWN grades — the `userId` filter is overridden with the
 * caller's session id, so an attacker-supplied `?userId=` can never widen the
 * result to another student (and the un-filtered "dump every grade" case is
 * impossible for non-admins). A grade admin (instructor/registrar) may filter
 * freely, including by an arbitrary `userId`.
 *
 * @param req - The request with optional `page`, `perPage`, and filter query params.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const sessionUserId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!sessionUserId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const page = Math.max(1, parseInt(req.query.page as string, 10) || 1)
  const perPage = Math.min(100, Math.max(1, parseInt(req.query.perPage as string, 10) || 20))
  const enrollmentId = req.query.enrollmentId as string | undefined
  const userId = req.query.userId as string | undefined
  const courseId = req.query.courseId as string | undefined
  const assignmentId = req.query.assignmentId as string | undefined

  const isAdmin = await isGradeAdmin(res)

  const where: WhereCondition[] = []
  if (enrollmentId) where.push({ field: 'enrollmentId', operator: '=', value: enrollmentId })
  if (isAdmin) {
    // Admins may filter by any student.
    if (userId) where.push({ field: 'userId', operator: '=', value: userId })
  } else {
    // Non-admins only ever see their own grades; ignore/override any
    // attacker-supplied `userId` filter with the authenticated caller's id.
    where.push({ field: 'userId', operator: '=', value: sessionUserId })
  }
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
