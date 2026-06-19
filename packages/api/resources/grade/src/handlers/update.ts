import { findById, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isGradeAdmin } from '../authorizers/index.js'
import { resolveLetter, toPercent } from '../scale.js'
import type { Grade, UpdateGradeInput } from '../types.js'

/**
 * Updates a grade by ID. Only `scorePoints`, `maxPoints`, and `comment`
 * can be amended. If a `scale` is supplied the letter is recomputed
 * against the new (or existing) score.
 *
 * Restricted to a grade-management authority (instructor/registrar/admin) and
 * enforced here (not merely via route middleware): the row's `userId` is the
 * student*, never the actor permitted to amend the grade, so a non-admin caller
 * is rejected (401 when unauthenticated, 403 otherwise) before anything is read
 * or written — defense-in-depth that does not depend on the `requireAdmin` route
 * middleware being wired, and that prevents a student editing their own grade.
 *
 * @param req - The request object with `id` param and {@link UpdateGradeInput} body.
 * @param res - The response object.
 */
export async function update(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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

  const id = req.params.id as string
  const input = req.body as UpdateGradeInput

  const grade = await findById<Grade>('grades', id)
  if (!grade) {
    res.status(404).json({
      error: t('grade.error.notFound', undefined, { defaultValue: 'Grade not found' }),
      errorKey: 'grade.error.notFound',
    })
    return
  }

  const nextScorePoints = input.scorePoints ?? grade.scorePoints
  const nextMaxPoints = input.maxPoints ?? grade.maxPoints

  if (
    typeof nextScorePoints !== 'number' ||
    typeof nextMaxPoints !== 'number' ||
    Number.isNaN(nextScorePoints) ||
    Number.isNaN(nextMaxPoints)
  ) {
    res.status(400).json({
      error: t('grade.error.scoreNumeric', undefined, {
        defaultValue: 'scorePoints and maxPoints must be numbers',
      }),
      errorKey: 'grade.error.scoreNumeric',
    })
    return
  }

  if (nextMaxPoints <= 0) {
    res.status(400).json({
      error: t('grade.error.maxPointsPositive', undefined, {
        defaultValue: 'maxPoints must be greater than zero',
      }),
      errorKey: 'grade.error.maxPointsPositive',
    })
    return
  }

  if (nextScorePoints < 0 || nextScorePoints > nextMaxPoints) {
    res.status(400).json({
      error: t('grade.error.scoreOutOfRange', undefined, {
        defaultValue: 'scorePoints must be between 0 and maxPoints',
      }),
      errorKey: 'grade.error.scoreOutOfRange',
    })
    return
  }

  const data: Record<string, unknown> = { updatedAt: new Date().toISOString() }
  if (input.scorePoints !== undefined) data.scorePoints = input.scorePoints
  if (input.maxPoints !== undefined) data.maxPoints = input.maxPoints
  if (input.comment !== undefined) data.comment = input.comment
  if (input.scale) {
    const percent = toPercent(nextScorePoints, nextMaxPoints)
    data.letter = percent !== null ? resolveLetter(percent, input.scale) : null
  }

  try {
    const result = await updateById<Grade>('grades', id, data)
    logger.debug('Grade updated', { id })
    res.json(result.data)
  } catch (error) {
    logger.error('Failed to update grade', { id, error })
    res.status(500).json({
      error: t('grade.error.updateFailed', undefined, {
        defaultValue: 'Failed to update grade',
      }),
      errorKey: 'grade.error.updateFailed',
    })
  }
}
