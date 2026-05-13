/**
 * `@molecule/app-message-preview-react` — conversation / thread row
 * for chat / inbox sidebars. Avatar with presence dot, name + preview
 * + timestamp + unread pip, active-selection treatment.
 *
 * Extracted from the customer-support-chat ConversationListItem and
 * its near-identical siblings in ai-customer-service-bot,
 * ai-voice-assistant, and team-chat. Generalised so the same row works
 * for support tickets, chat threads, voicemail inboxes, etc.
 *
 * @example
 * ```tsx
 * import { MessagePreview } from '@molecule/app-message-preview-react'
 *
 * <MessagePreview
 *   name="Maya Patel"
 *   preview="Thanks! That fixed it."
 *   timestamp="2m"
 *   unread={3}
 *   presence="online"
 *   channelIcon="mail"
 *   active={selectedId === thread.id}
 *   to={`/conversation/${thread.id}`}
 * />
 * ```
 *
 * @module
 */

export * from './MessagePreview.js'
