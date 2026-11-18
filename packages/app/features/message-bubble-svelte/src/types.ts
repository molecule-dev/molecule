/**
 * Types for the Svelte message/chat primitives — the same props and data shapes
 * `@molecule/app-message-bubble-react` accepts, with a Svelte snippet where
 * React takes a node.
 *
 * @module
 */

import type { Snippet } from 'svelte'

/** Message author. */
export interface MessageAuthor {
  /** Author id — used to derive `role` (self vs other) in rendering. */
  id: string
  /** Display name. */
  name: string
  /** Optional avatar URL. */
  avatarSrc?: string
}

/** Data shape for a single chat message rendered by the bubble component. */
export interface MessageData {
  id: string
  author: MessageAuthor
  /** Message body (a snippet, or plain text). */
  body: Snippet | string | number
  /** Timestamp display (a snippet, or plain text), rendered verbatim. */
  timestamp: Snippet | string | number
  /** Optional attachments list (a snippet, or plain text). */
  attachments?: Snippet | string | number
  /** Optional reactions row (a snippet, or plain text). */
  reactions?: Snippet | string | number
  /** Optional thread-indicator (a snippet, or plain text). */
  thread?: Snippet | string | number
}

/** Describes a single file attachment rendered inside a message bubble. */
export interface MessageAttachment {
  id: string
  name: string
  /** Size label (e.g. "2.3 MB"). */
  size?: string
  /** Action slot — typically a download button (a snippet). */
  action?: Snippet
  /** Optional leading icon (a snippet). */
  icon?: Snippet
}

/** Props accepted by the {@link MessageAttachments} component. */
export interface MessageAttachmentsProps {
  attachments: MessageAttachment[]
  /** Extra classes on the outer wrapper. */
  className?: string
}

/** Props accepted by the {@link MessageBubble} component. */
export interface MessageBubbleProps {
  message: MessageData
  /** Whether the current viewer is the message author (affects alignment). */
  isSelf?: boolean
  /** Render the author row (avatar + name + time). Defaults to true. */
  showMeta?: boolean
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link MessageComposer} component. */
export interface MessageComposerProps {
  /** Called when the user submits. */
  onSubmit: (value: string) => void
  /** Optional placeholder. */
  placeholder?: string
  /** Whether Ctrl/Cmd-Enter submits. Defaults to true. */
  submitOnEnter?: boolean
  /** Optional leading slot (a snippet). */
  leading?: Snippet
  /** Optional trailing slot rendered before the submit button (a snippet). */
  trailing?: Snippet
  /** Disable input + submit. */
  disabled?: boolean
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link MessageList} component. */
export interface MessageListProps {
  messages: MessageData[]
  /** When provided, viewer-authored messages flip alignment to the right. */
  selfAuthorId?: string
  /** Optional date separator renderer (receives the current message and index). */
  renderDateSeparator?: Snippet<[MessageData, number]>
  /** Empty-state node when `messages` is empty (a snippet). */
  emptyState?: Snippet
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link MessageMeta} component. */
export interface MessageMetaProps {
  /** Author display name (a snippet, or plain text). */
  author: Snippet | string | number
  /** Timestamp display (a snippet, or plain text). */
  timestamp: Snippet | string | number
  /** Extra classes. */
  className?: string
}

/** A single emoji reaction with its count and current-user state. */
export interface MessageReaction {
  /** Emoji or symbol. */
  emoji: string
  /** Reaction count. */
  count: number
  /** Whether the current user reacted. */
  reactedByMe?: boolean
}

/** Props accepted by the {@link MessageReactions} component. */
export interface MessageReactionsProps {
  reactions: MessageReaction[]
  /** Called when a reaction chip is toggled. */
  onToggle?: (emoji: string) => void
  /** Called when the "+" button is clicked (receives the click event, as React passes it). */
  onAdd?: (event: Event) => void
  /** Extra classes. */
  className?: string
}

/** Props accepted by the {@link ThreadIndicator} component. */
export interface ThreadIndicatorProps {
  /** Number of replies. */
  replyCount: number
  /** Last-reply timestamp display (a snippet, or plain text). */
  lastReplyAt?: Snippet | string | number
  /** Called when clicked (receives the click event, as React passes it). */
  onOpen?: (event: Event) => void
  /** Extra classes. */
  className?: string
}
