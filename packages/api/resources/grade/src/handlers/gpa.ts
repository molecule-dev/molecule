import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getGpa } from '../aggregate.js'
import { defaultGradeScale } from '../scale.js'

/**
 * Returns a student's GPA on the default 4.0 plus/minus scale.
 *
 * 404 if the student has no graded courses.
 *
 * @param req - The request with `userId` param.
 * @param res - The response object.
 */
export async function gpa(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = req.params.userId as string

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
