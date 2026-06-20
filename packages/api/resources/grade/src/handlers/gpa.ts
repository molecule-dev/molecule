import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getGpa } from '../aggregate.js'
import { isGradeAdmin } from '../authorizers/index.js'
import { defaultGradeScale } from '../scale.js'

/**
 * Returns a student's GPA on the default 4.0 plus/minus scale.
 *
 * 404 if the student has no graded courses.
 *
 * Fail-closed authorization (defense-in-depth, independent of the route
 * middleware): rejects an anonymous caller (401) and only allows the request when
 * the caller is the student themselves (`req.params.userId === session.userId`)
 * or a grade admin; otherwise 403. One student can never read another's GPA.
 *
 * @param req - The request with `userId` param.
 * @param res - The response object.
 */
export async function gpa(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const sessionUserId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!sessionUserId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const userId = req.params.userId as string

  if (userId !== sessionUserId && !(await isGradeAdmin(res))) {
    res.status(403).json({
      error: t('grade.error.forbidden', undefined, {
        defaultValue: 'You do not have access to these grades',
      }),
      errorKey: 'grade.error.forbidden',
    })
    return
  }

  try {
    const result = await getGpa(userId, defaultGradeScale)
    if (!result) {
      res.status(404).json({
        error: t('grade.error.noGrades', undefined, {
          defaultValue: 'No graded courses found for user',
        }),
        errorKey: 'grade.error.noGrades',
      })
      return
    }
    res.json(result)
  } catch (error) {
    logger.error('Failed to compute GPA', { userId, error })
    res.status(500).json({
      error: t('grade.error.gpaFailed', undefined, {
        defaultValue: 'Failed to compute GPA',
      }),
      errorKey: 'grade.error.gpaFailed',
    })
  }
}
