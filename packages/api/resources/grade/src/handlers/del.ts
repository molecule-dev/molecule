import { deleteById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { isGradeAdmin } from '../authorizers/index.js'

/**
 * Deletes a grade by ID.
 *
 * Restricted to a grade-management authority (instructor/registrar/admin) and
 * enforced here (not merely via route middleware): the row's `userId` is the
 * *student*, never the actor permitted to delete the grade, so a non-admin caller
 * is rejected (401 when unauthenticated, 403 otherwise) before anything is
 * deleted — defense-in-depth that does not depend on the `requireAdmin` route
 * middleware being wired.
 *
 * @param req - The request object with `id` param.
 * @param res - The response object.
 */
export async function del(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
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
