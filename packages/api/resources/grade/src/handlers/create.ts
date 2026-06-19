import { create as dbCreate } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isGradeAdmin } from '../authorizers/index.js'
import { resolveLetter, toPercent } from '../scale.js'
import type { Grade, PostGradeInput } from '../types.js'

/**
 * Posts a new grade for an assignment.
 *
 * Validates that all foreign keys are present and that scoring is sane
 * (`scorePoints >= 0`, `maxPoints > 0`, `scorePoints <= maxPoints`).
 * If a `scale` is supplied on the input the resolved letter is stored.
 *
 * Restricted to a grade-management authority (instructor/registrar/admin) and
 * enforced here (not merely via route middleware): the row's `userId` is the
 * student being graded — never the actor permitted to post the grade — so a
 * non-admin caller is rejected (401 when unauthenticated, 403 otherwise) before
 * any grade row is inserted — defense-in-depth that does not depend on the
 * `requireAdmin` route middleware being wired, and that prevents a student
 * posting arbitrary scores for any user.
 *
 * @param req - The request with {@link PostGradeInput} body.
 * @param res - The response object.
 */
export async function create(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }
  if (!(await isGradeAdmin(res))) {
    res.status(403).json({
      error: t('grade.error.forbidden', undefined, {
        defaultValue: 'Permission required to manage grades',
      }),
      errorKey: 'grade.error.forbidden',
    })
    return
  }

  const input = req.body as PostGradeInput

  if (
    !input.enrollmentId?.trim() ||
    !input.assignmentId?.trim() ||
    !input.userId?.trim() ||
    !input.courseId?.trim()
  ) {
    res.status(400).json({
      error: t('grade.error.foreignKeysRequired', undefined, {
        defaultValue: 'enrollmentId, assignmentId, userId, and courseId are required',
      }),
      errorKey: 'grade.error.foreignKeysRequired',
    })
    return
  }

  if (
    typeof input.scorePoints !== 'number' ||
    typeof input.maxPoints !== 'number' ||
    Number.isNaN(input.scorePoints) ||
    Number.isNaN(input.maxPoints)
  ) {
    res.status(400).json({
      error: t('grade.error.scoreNumeric', undefined, {
        defaultValue: 'scorePoints and maxPoints must be numbers',
      }),
      errorKey: 'grade.error.scoreNumeric',
    })
    return
  }

  if (input.maxPoints <= 0) {
    res.status(400).json({
      error: t('grade.error.maxPointsPositive', undefined, {
        defaultValue: 'maxPoints must be greater than zero',
      }),
      errorKey: 'grade.error.maxPointsPositive',
    })
    return
  }

  if (input.scorePoints < 0 || input.scorePoints > input.maxPoints) {
    res.status(400).json({
      error: t('grade.error.scoreOutOfRange', undefined, {
        defaultValue: 'scorePoints must be between 0 and maxPoints',
      }),
      errorKey: 'grade.error.scoreOutOfRange',
    })
    return
  }

  const percent = toPercent(input.scorePoints, input.maxPoints)
  const letter = percent !== null && input.scale ? resolveLetter(percent, input.scale) : null

  const now = new Date().toISOString()

  try {
    const result = await dbCreate<Grade>('grades', {
      enrollmentId: input.enrollmentId,
      assignmentId: input.assignmentId,
      userId: input.userId,
      courseId: input.courseId,
      scorePoints: input.scorePoints,
      maxPoints: input.maxPoints,
      letter,
      comment: input.comment ?? null,
      postedAt: now,
    })

    logger.debug('Grade posted', {
      gradeId: result.data?.id,
      enrollmentId: input.enrollmentId,
      assignmentId: input.assignmentId,
    })
    res.status(201).json(result.data)
  } catch (error) {
    logger.error('Failed to post grade', {
      enrollmentId: input.enrollmentId,
      assignmentId: input.assignmentId,
      error,
    })
    res.status(500).json({
      error: t('grade.error.createFailed', undefined, {
        defaultValue: 'Failed to post grade',
      }),
      errorKey: 'grade.error.createFailed',
    })
  }
}
