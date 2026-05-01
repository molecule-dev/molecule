import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { getTranscript } from '../aggregate.js'
import { defaultGradeScale } from '../scale.js'

/**
 * Returns a student's full transcript: per-course averages, letters,
 * and overall GPA.
 *
 * 404 if the student has no grades. Pass `?scale=raw` to suppress
 * letter / GPA computation.
 *
 * @param req - The request with `userId` param and optional `scale=raw` query.
 * @param res - The response object.
 */
export async function transcript(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = req.params.userId as string
  const wantsRaw = req.query.scale === 'raw'

  try {
    const result = await getTranscript(userId, wantsRaw ? undefined : defaultGradeScale)
    if (!result) {
      res.status(404).json({
        error: t('grade.error.noGrades', undefined, {
          defaultValue: 'No grades found for user',
        }),
        errorKey: 'grade.error.noGrades',
      })
      return
    }
    res.json(result)
  } catch (error) {
    logger.error('Failed to build transcript', { userId, error })
    res.status(500).json({
      error: t('grade.error.transcriptFailed', undefined, {
        defaultValue: 'Failed to build transcript',
      }),
      errorKey: 'grade.error.transcriptFailed',
    })
  }
}
