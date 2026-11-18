/**
 * Types of `@molecule/app-message-bubble-angular` — the Angular counterpart of
 * `@molecule/app-message-bubble-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A node-valued prop: projected content reaches the component as a projected
 * `[slot=<name>]` element, and a node passed as a prop value reaches it as an
 * `ng-template` reference; plain text renders as text. An input cannot carry a
 * live DOM node, so both shapes are accepted here.
 */
type MessageNode = TemplateRef<unknown> | string | null

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
  /** Message body — text, or an `ng-template`. */
  body: MessageNode
  /** Timestamp display (text, or an `ng-template`), rendered verbatim. */
  timestamp: MessageNode
  /** Optional attachments list (text, or an `ng-template`). */
  attachments?: MessageNode
  /** Optional reactions row (text, or an `ng-template`). */
  reactions?: MessageNode
  /** Optional thread-indicator (text, or an `ng-template`). */
  thread?: MessageNode
}

/** Describes a single file attachment rendered inside a message bubble. */
export interface MessageAttachment {
  id: string
  name: string
  /** Size label (e.g. "2.3 MB"). */
  size?: string
  /** Action slot — typically a download button (an `ng-template`). */
  action?: MessageNode
  /** Optional leading icon (an `ng-template`). */
  icon?: MessageNode
}

/** Props accepted by {@link MessageAttachments} — the same props React's accepts. */
export interface MessageAttachmentsProps {
  attachments: MessageAttachment[]
  /** Extra classes on the outer wrapper. */
  className?: string
}

/** Props accepted by {@link MessageBubble} — the same props React's accepts. */
export interface MessageBubbleProps {
  message: MessageData
  /** Whether the current viewer is the message author (affects alignment). */
  isSelf?: boolean
  /** Render the author row (avatar + name + time). Defaults to true. */
  showMeta?: boolean
  /** Extra classes. */
  className?: string
}

/** Props accepted by {@link MessageComposer} — the same props React's accepts. */
export interface MessageComposerProps {
  /** Called when the user submits. */
  onSubmit: (value: string) => void
  /** Optional placeholder. */
  placeholder?: string
  /** Whether Ctrl/Cmd-Enter submits. Defaults to true. */
  submitOnEnter?: boolean
  /** Optional leading slot (projected `[slot=leading]`, or an `ng-template`). */
  leading?: MessageNode
  /** Optional trailing slot rendered before the submit button. */
  trailing?: MessageNode
  /** Disable input + submit. */
  disabled?: boolean
  /** Extra classes. */
  className?: string
}

/** Props accepted by {@link MessageList} — the same props React's accepts. */
export interface MessageListProps {
  messages: MessageData[]
  /** When provided, viewer-authored messages flip alignment to the right. */
  selfAuthorId?: string
  /** Optional date separator renderer (an `ng-template` receiving the message). */
  renderDateSeparator?: TemplateRef<unknown> | null
  /** Empty-state node when `messages` is empty (text, or an `ng-template`). */
  emptyState?: MessageNode
  /** Extra classes. */
  className?: string
}

/** Props accepted by {@link MessageMeta} — the same props React's accepts. */
export interface MessageMetaProps {
  /** Author display name (text, or an `ng-template`). */
  author: MessageNode
  /** Timestamp display (text, or an `ng-template`). */
  timestamp: MessageNode
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

/** Props accepted by {@link MessageReactions} — the same props React's accepts. */
export interface MessageReactionsProps {
  reactions: MessageReaction[]
  /** Called when a reaction chip is toggled. */
  onToggle?: (emoji: string) => void
  /** Called when the "+" button is clicked (receives the click event, as React passes it). */
  onAdd?: (event: Event) => void
  /** Extra classes. */
  className?: string
}

/** Props accepted by {@link ThreadIndicator} — the same props React's accepts. */
export interface ThreadIndicatorProps {
  /** Number of replies. */
  replyCount: number
  /** Last-reply timestamp display (text, or an `ng-template`). */
  lastReplyAt?: MessageNode
  /** Called when clicked (receives the click event, as React passes it). */
  onOpen?: (event: Event) => void
  /** Extra classes. */
  className?: string
}
