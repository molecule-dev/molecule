import type { JSX } from 'solid-js'

/**
 * Types for the Solid message/chat primitives — the same props and data shapes
 * `@molecule/app-message-bubble-react` accepts, with Solid's JSX element where
 * React takes a node.
 *
 * @module
 */

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
  /** Message body — usually plain text; JSX renders rich content. */
  body: JSX.Element
  /** Timestamp display (pre-formatted, as React renders it verbatim). */
  timestamp: JSX.Element
  /** Optional attachments list (rendered below the body). */
  attachments?: JSX.Element
  /** Optional reactions row. */
  reactions?: JSX.Element
  /** Optional thread-indicator (reply count + last reply time). */
  thread?: JSX.Element
}

/** Describes a single file attachment rendered inside a message bubble. */
export interface MessageAttachment {
  id: string
  name: string
  /** Size label (e.g. "2.3 MB"). */
  size?: string
  /** Action slot — typically a download button. */
  action?: JSX.Element
  /** Optional leading icon. */
  icon?: JSX.Element
}

/** Props for {@link MessageAttachments}. */
export interface MessageAttachmentsProps {
  attachments: MessageAttachment[]
  /** Extra classes on the outer wrapper. */
  className?: string
}

/** Props for {@link MessageBubble}. */
export interface MessageBubbleProps {
  message: MessageData
  /** Whether the current viewer is the message author (affects alignment). */
  isSelf?: boolean
  /** Render the author row (avatar + name + time). Defaults to true. */
  showMeta?: boolean
  /** Extra classes. */
  className?: string
}

/** Props for {@link MessageComposer}. */
export interface MessageComposerProps {
  /** Called when the user submits. */
  onSubmit: (value: string) => void
  /** Optional placeholder. */
  placeholder?: string
  /** Whether Ctrl/Cmd-Enter submits. Defaults to true. */
  submitOnEnter?: boolean
  /** Optional leading slot (e.g. attachment button). */
  leading?: JSX.Element
  /** Optional trailing slot rendered before the submit button. */
  trailing?: JSX.Element
  /** Disable input + submit. */
  disabled?: boolean
  /** Extra classes. */
  className?: string
}

/** Props for {@link MessageList}. */
export interface MessageListProps {
  messages: MessageData[]
  /** When provided, viewer-authored messages flip alignment to the right. */
  selfAuthorId?: string
  /** Optional date separator renderer (receives the current message). */
  renderDateSeparator?: (message: MessageData, i: number) => JSX.Element
  /** Empty-state node when `messages` is empty. */
  emptyState?: JSX.Element
  /** Extra classes. */
  className?: string
}

/** Props for {@link MessageMeta}. */
export interface MessageMetaProps {
  /** Author display name. */
  author: JSX.Element
  /** Timestamp display. */
  timestamp: JSX.Element
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

/** Props for {@link MessageReactions}. */
export interface MessageReactionsProps {
  reactions: MessageReaction[]
  /** Called when a reaction chip is toggled. */
  onToggle?: (emoji: string) => void
  /** Called when the "+" button is clicked (receives the click event, as React passes it). */
  onAdd?: (event: Event) => void
  /** Extra classes. */
  className?: string
}

/** Props for {@link ThreadIndicator}. */
export interface ThreadIndicatorProps {
  /** Number of replies. */
  replyCount: number
  /** Last-reply timestamp display. */
  lastReplyAt?: JSX.Element
  /** Called when clicked (receives the click event, as React passes it). */
  onOpen?: (event: Event) => void
  /** Extra classes. */
  className?: string
}
