import { findById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Grade } from '../types.js'

/**
 * Reads a single grade by ID. Returns 404 if not found.
 * @param req - The request object with `id` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string

  try {
    const grade = await findById<Grade>('grades', id)
    if (!grade) {
      res.status(404).json({
        error: t('grade.error.notFound', undefined, { defaultValue: 'Grade not found' }),
        errorKey: 'grade.error.notFound',
      })
      return
    }

    res.json(grade)
  } catch (error) {
    logger.error('Failed to read grade', { id, error })
    res.status(500).json({
      error: t('grade.error.readFailed', undefined, {
        defaultValue: 'Failed to read grade',
      }),
      errorKey: 'grade.error.readFailed',
    })
  }
}
