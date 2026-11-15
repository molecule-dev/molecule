/**
 * Types of `@molecule/app-forum-thread-row-angular` — the Angular counterpart
 * of `@molecule/app-forum-thread-row-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props for {@link ForumThreadRow} — the same props
 * `@molecule/app-forum-thread-row-react` accepts. Node-valued props (`title`,
 * `excerpt`, `author`, `createdAt`, `tags`, `voteControls`) are projected
 * content in Angular (an input cannot carry a node): pass a string value
 * through the input, and element content in the host template as
 * `[slot=<name>]` content.
 */
export interface ForumThreadRowProps {
  /** Thread title; element content is projected as `[slot=title]` content. */
  title?: unknown
  /** Optional snippet of the OP body; projected as `[slot=excerpt]` content. */
  excerpt?: unknown
  /** Aggregate vote score / upvotes. */
  voteScore?: number
  /** Reply count. */
  replyCount?: number
  /** View count. */
  viewCount?: number
  /** Optional pinned indicator. */
  pinned?: boolean
  /** Optional locked indicator. */
  locked?: boolean
  /** Author display; projected as `[slot=author]` content. */
  author?: unknown
  /** Created-at display; projected as `[slot=createdAt]` content. */
  createdAt?: unknown
  /** Tag chips; projected as `[slot=tags]` content. */
  tags?: unknown
  /** Right-side voting controls; projected as `[slot=voteControls]` content. */
  voteControls?: unknown
  /** Click handler; receives the DOM click event. */
  onClick?: (event: Event) => void
  /** Extra classes. */
  className?: string
}
