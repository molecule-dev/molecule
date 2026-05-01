import { deleteById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

/**
 * Deletes a grade by ID.
 * @param req - The request object with `id` param.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const id = req.params.id as string

  try {
    const result = await deleteById('grades', id)
    if (result.affected === 0) {
      res.status(404).json({
        error: t('grade.error.notFound', undefined, { defaultValue: 'Grade not found' }),
        errorKey: 'grade.error.notFound',
      })
      return
    }
    logger.debug('Grade deleted', { id })
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to delete grade', { id, error })
    res.status(500).json({
      error: t('grade.error.deleteFailed', undefined, {
        defaultValue: 'Failed to delete grade',
      }),
      errorKey: 'grade.error.deleteFailed',
    })
  }
}
