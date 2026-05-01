/**
 * Read workspace handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { assertMember, getWorkspace } from '../service.js'

/**
 * Reads a single workspace by id. Caller must be a member.
 *
 * @param req - The request with `:id` param.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const { id } = req.params
  if (!id) {
    res.status(400).json({
      error: t('workspace.error.missingId', undefined, { defaultValue: 'Workspace id required' }),
      errorKey: 'workspace.error.missingId',
    })
    return
  }

  try {
    await assertMember(id, userId)
    const workspace = await getWorkspace(id)
    if (!workspace) {
      res.status(404).json({
        error: t('workspace.error.notFound', undefined, { defaultValue: 'Workspace not found' }),
        errorKey: 'workspace.error.notFound',
      })
      return
    }
    res.json(workspace)
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code === 'workspace.error.notAMember') {
      res.status(403).json({
        error: t(code, undefined, { defaultValue: 'Not a member of this workspace' }),
        errorKey: code,
      })
      return
    }
    logger.error('Failed to read workspace', { userId, id, error })
    res.status(500).json({
      error: t('workspace.error.readFailed', undefined, {
        defaultValue: 'Failed to read workspace',
      }),
      errorKey: 'workspace.error.readFailed',
    })
  }
}
