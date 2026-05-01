/**
 * List shares handler.
 *
 * @module
 */

import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { listShares } from '../service.js'
import type { PrincipalType } from '../types.js'

const VALID_PRINCIPAL_TYPES: PrincipalType[] = ['user', 'team', 'public']

/**
 * Lists shares attached to a resource, identified by `resourceType` and
 * `resourceId` query/path params.
 *
 * @param req - The request with `resourceType`, `resourceId` params and optional pagination/filter query.
 * @param res - The response object.
 */
export async function list(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const userId = (res.locals.session as { userId?: string } | undefined)?.userId
  if (!userId) {
    res.status(401).json({
      error: t('resource.error.unauthorized', undefined, { defaultValue: 'Unauthorized' }),
      errorKey: 'resource.error.unauthorized',
    })
    return
  }

  const resourceType = (req.params.resourceType ?? req.query.resourceType) as string | undefined
  const resourceId = (req.params.resourceId ?? req.query.resourceId) as string | undefined

  if (!resourceType || !resourceId) {
    res.status(400).json({
      error: t('share.error.missingResource', undefined, {
        defaultValue: 'Resource type and ID are required',
      }),
      errorKey: 'share.error.missingResource',
    })
    return
  }

  const principalTypeRaw = req.query.principalType as string | undefined
  const principalType =
    principalTypeRaw && VALID_PRINCIPAL_TYPES.includes(principalTypeRaw as PrincipalType)
      ? (principalTypeRaw as PrincipalType)
      : undefined
  const limit = parseInt(req.query.limit as string, 10) || 50
  const offset = parseInt(req.query.offset as string, 10) || 0

  try {
    const result = await listShares(resourceType, resourceId, { principalType, limit, offset })
    res.json(result)
  } catch (error) {
    logger.error('Failed to list shares', { userId, resourceType, resourceId, error })
    res.status(500).json({
      error: t('share.error.listFailed', undefined, {
        defaultValue: 'Failed to list shares',
      }),
      errorKey: 'share.error.listFailed',
    })
  }
}
