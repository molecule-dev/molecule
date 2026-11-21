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
  /**
   * Activates the row: the whole row is clickable through a transparent native
   * button laid over it (Enter and Space activate it natively), named by the
   * title — the `<h3>` itself takes the generated id. The `voteControls` and
   * `tags` slots sit above that button and keep their own clicks. Called with
   * no arguments, the way React's transparent button calls it.
   */
  onClick?: () => void
  /** Extra classes. */
  className?: string
}
