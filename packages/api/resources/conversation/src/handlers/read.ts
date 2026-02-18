import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Conversation } from '../types.js'

/**
 * Reads a single conversation by project ID, returning 404 if not found.
 * @param req - The request object.
 * @param res - The response object.
 */
export async function read(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const projectId = req.params.projectId as string

  try {
    const conversation = await findOne<Conversation>('conversations', [
      { field: 'projectId', operator: '=', value: projectId },
    ])

    if (!conversation) {
      res
        .status(404)
        .json({ error: t('conversation.error.notFound'), errorKey: 'conversation.error.notFound' })
      return
    }

    res.json(conversation)
  } catch (error) {
    logger.error('Failed to read conversation', { projectId, error })
    res.status(500).json({
      error: t('conversation.error.readFailed'),
      errorKey: 'conversation.error.readFailed',
    })
  }
}
