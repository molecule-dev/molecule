import type { ChatMessage as AIChatMessage, ChatParams, ContentBlock } from '@molecule/api-ai'
import { getProvider as getAIProvider } from '@molecule/api-ai'
import { getAnalytics } from '@molecule/api-bond'
import { create as dbCreate, findOne, updateById } from '@molecule/api-database'
import { t } from '@molecule/api-i18n'
import { logger } from '@molecule/api-logger'

const analytics = getAnalytics()
import type { MoleculeRequest, MoleculeResponse } from '@molecule/api-resource'

import type { ChatAttachment, ChatMessage, Conversation, SendMessageInput } from '../types.js'

/**
 * Sends a message to a conversation and streams the AI response via SSE.
 * @param req - The request object.
 * @param res - The response object.
 */
export async function chat(req: MoleculeRequest, res: MoleculeResponse): Promise<void> {
  const projectId = req.params.projectId as string
  const input = req.body as SendMessageInput

  logger.debug('Chat message received', { projectId })

  if (!input.message) {
    res.status(400).json({
      error: t('conversation.error.messageRequired'),
      errorKey: 'conversation.error.messageRequired',
    })
    return
  }

  // Find or create conversation for this project
  let conversation = await findOne<Conversation>('conversations', [
    { field: 'projectId', operator: '=', value: projectId },
  ])

  const userMessage: ChatMessage = {
    role: 'user',
    content: input.message,
    timestamp: new Date().toISOString(),
  }

  if (!conversation) {
    const result = await dbCreate<Conversation>('conversations', {
      projectId,
      messages: JSON.stringify([userMessage]),
      aiContext: JSON.stringify({}),
    })
    conversation = result.data!
  } else {
    const messages = [...conversation.messages, userMessage]
    await updateById('conversations', conversation.id, {
      messages: JSON.stringify(messages),
      updatedAt: new Date().toISOString(),
    })
    conversation.messages = messages
  }

  analytics
    .track({
      name: 'conversation.message_sent',
      properties: { projectId, conversationId: conversation.id },
    })
    .catch(() => {})

  // SSE streaming
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()

  // Send the conversation ID so the client can track it
  res.write(`data: ${JSON.stringify({ type: 'conversation', id: conversation.id })}\n\n`)

  const aiProvider = getAIProvider()
  if (!aiProvider) {
    logger.warn('AI provider not configured')
    res.write(
      `data: ${JSON.stringify({ type: 'error', message: t('conversation.error.aiNotConfigured'), errorKey: 'conversation.error.aiNotConfigured' })}\n\n`,
    )
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
    return
  }

  // Build AI message history from conversation
  const aiMessages: AIChatMessage[] = conversation.messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  // Convert attachments on the current user message to ContentBlock[]
  if (input.attachments?.length) {
    const lastMsg = aiMessages[aiMessages.length - 1]
    const blocks: ContentBlock[] = []
    if (lastMsg.content) {
      blocks.push({ type: 'text', text: lastMsg.content as string })
    }
    for (const att of input.attachments) {
      blocks.push(attachmentToBlock(att))
    }
    lastMsg.content = blocks
  }

  const chatParams: ChatParams = {
    messages: aiMessages,
    system: conversation.aiContext?.system,
    model: input.model,
    stream: true,
  }

  let aborted = false
  req.on?.('close', () => {
    aborted = true
  })

  let assistantText = ''
  const toolCalls: ChatMessage['toolCalls'] = []

  try {
    for await (const event of aiProvider.chat(chatParams)) {
      if (aborted) break

      switch (event.type) {
        case 'text':
          assistantText += event.content
          res.write(`data: ${JSON.stringify(event)}\n\n`)
          break
        case 'tool_use':
          toolCalls!.push({
            id: event.id,
            name: event.name,
            input: event.input,
          })
          res.write(`data: ${JSON.stringify(event)}\n\n`)
          break
        case 'done':
          res.write(`data: ${JSON.stringify(event)}\n\n`)
          break
        case 'error':
          res.write(`data: ${JSON.stringify(event)}\n\n`)
          break
      }
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : t('conversation.error.unknownAiError')
    const errorKey =
      err instanceof Error ? 'conversation.error.streamError' : 'conversation.error.unknownAiError'
    logger.error('AI streaming error', { conversationId: conversation.id, error: message })
    analytics
      .track({ name: 'conversation.ai_error', properties: { conversationId: conversation.id } })
      .catch(() => {})
    if (!aborted) {
      res.write(`data: ${JSON.stringify({ type: 'error', message, errorKey })}\n\n`)
    }
  }

  // Save assistant message to conversation
  if (assistantText || toolCalls!.length > 0) {
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: assistantText,
      timestamp: new Date().toISOString(),
      ...(toolCalls!.length > 0 ? { toolCalls } : {}),
    }
    const updatedMessages = [...conversation.messages, assistantMessage]
    await updateById('conversations', conversation.id, {
      messages: JSON.stringify(updatedMessages),
      updatedAt: new Date().toISOString(),
    })
  }

  if (!aborted) {
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
    res.end()
  }
}

/**
 * Maps a chat attachment to the appropriate `ContentBlock` type based on MIME type.
 * @param att - The attachment to convert.
 * @returns A typed content block for the AI provider.
 */
function attachmentToBlock(att: ChatAttachment): ContentBlock {
  if (att.mediaType.startsWith('image/')) {
    return { type: 'image', mediaType: att.mediaType, data: att.data }
  }
  if (att.mediaType === 'application/pdf') {
    return { type: 'document', mediaType: att.mediaType, data: att.data, filename: att.filename }
  }
  if (att.mediaType.startsWith('audio/')) {
    return { type: 'audio', mediaType: att.mediaType, data: att.data }
  }
  if (att.mediaType.startsWith('video/')) {
    return { type: 'video', mediaType: att.mediaType, data: att.data }
  }
  return { type: 'text', text: `[Unsupported attachment: ${att.filename ?? att.mediaType}]` }
}
