import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getCourseAverage } from '../aggregate.js'
import { isGradeAdmin } from '../authorizers/index.js'
import { defaultGradeScale } from '../scale.js'

/**
 * Returns the course average for a single enrollment.
 *
 * 404 if the enrollment has no grades. The default 4.0 plus/minus
 * scale is used unless `?scale=raw` is passed (which suppresses the
 * letter).
 *
 * Fail-closed authorization (defense-in-depth, independent of the route
 * middleware): rejects an anonymous caller (401). The enrollment's owning student
 * is resolved from the aggregated grades; a non-admin caller is only served when
 * that owner is themselves (`average.userId === session.userId`), otherwise 403.
 * A grade admin (instructor/registrar) sees any enrollment's average.
 *
 * @param req - The request with `enrollmentId` param and optional `scale=raw` query.
 * @param res - The response object.
 */
export async function courseAverage(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const sessionUserId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!sessionUserId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const enrollmentId = req.params.enrollmentId as string
  const wantsRaw = req.query.scale === 'raw'

  try {
    const average = await getCourseAverage(enrollmentId, wantsRaw ? undefined : defaultGradeScale)
    if (!average) {
      res.status(404).json({
        error: t('grade.error.noGrades', undefined, {
          defaultValue: 'No grades found for enrollment',
        }),
        errorKey: 'grade.error.noGrades',
      })
      return
    }

    if (average.userId !== sessionUserId && !(await isGradeAdmin(res))) {
      res.status(403).json({
        error: t('grade.error.forbidden', undefined, {
          defaultValue: 'You do not have access to these grades',
        }),
        errorKey: 'grade.error.forbidden',
      })
      return
    }

    res.json(average)
  } catch (error) {
    logger.error('Failed to compute course average', { enrollmentId, error })
    res.status(500).json({
      error: t('grade.error.courseAverageFailed', undefined, {
        defaultValue: 'Failed to compute course average',
      }),
      errorKey: 'grade.error.courseAverageFailed',
    })
  }
}
