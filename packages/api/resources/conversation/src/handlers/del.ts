import { getAnalytics } from '@molecule/api-bond'
import { deleteById, findOne } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { Conversation } from '../types.js'

const analytics = getAnalytics()

/**
 * Deletes a conversation and all its messages for a given project.
 * @param req - The request object.
 * @param res - The response object.
 */
export async function clear(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const projectId = req.params.projectId as string

  try {
    const conversation = await findOne<Conversation>('conversations', [
      { field: 'projectId', operator: '=', value: projectId },
    ])

    if (!conversation) {
      res.status(204).end()
      return
    }

    await deleteById('conversations', conversation.id)
    analytics
      .track({
        name: 'conversation.cleared',
        properties: { projectId, conversationId: conversation.id },
      })
      .catch(() => {})
    res.status(204).end()
  } catch (error) {
    logger.error('Failed to clear conversation', { projectId, error })
    res.status(500).json({
      error: t('conversation.error.clearFailed'),
      errorKey: 'conversation.error.clearFailed',
    })
  }
}
