import { findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import { ensureProjectAccess } from '../authorizers/authUser.js'
import type { Conversation } from '../types.js'

/**
 * Returns the full message history for a project's conversation.
 * @param req - The request object.
 * @param res - The response object.
 */
export async function history(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  // Defense-in-depth: fail closed even if the route middleware was dropped, so a
  // non-owner can never read another tenant's conversation history (IDOR).
  if (!(await ensureProjectAccess(req, res))) {
    return
  }

  const projectId = req.params.projectId as string

  try {
    const conversation = await findOne<Conversation>('conversations', [
      { field: 'projectId', operator: '=', value: projectId },
    ])

    if (!conversation) {
      res.json({ messages: [] })
      return
    }

    res.json({ messages: conversation.messages })
  } catch (error) {
    logger.error('Failed to load conversation history', { projectId, error })
    res.status(500).json({
      error: t('conversation.error.historyFailed'),
      errorKey: 'conversation.error.historyFailed',
    })
  }
}
