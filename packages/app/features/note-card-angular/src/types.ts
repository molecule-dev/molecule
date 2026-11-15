/**
 * Types of `@molecule/app-note-card-angular` — the Angular counterpart of
 * `@molecule/app-note-card-react`, same props and DOM.
 *
 * @module
 */

/**
 * Props for {@link NoteCard} — the same props
 * `@molecule/app-note-card-react` accepts. Node-valued props (`title`,
 * `body`, `modifiedAt`, `actions`) are projected content in Angular (an
 * input cannot carry a node): pass a string value through the input, and
 * element content in the host template as `[slot=<name>]` content.
 */
export interface NoteCardProps {
  /**
   * Note title. A string or number renders as text; element content is
   * projected as `[slot=title]` content instead.
   */
  title?: unknown
  /**
   * Note body text. A string or number renders as text; element content is
   * projected as `[slot=body]` content instead.
   */
  body?: unknown
  /** Background tint (CSS color). */
  color?: string
  /** Optional pin / starred indicator. */
  pinned?: boolean
  /**
   * Optional last-modified display. A string or number renders as text;
   * element content is projected as `[slot=modifiedAt]` content instead.
   */
  modifiedAt?: unknown
  /** Optional right-side actions (edit, archive, delete), projected as `[slot=actions]` content. */
  actions?: unknown
  /** Click handler; receives the DOM click event. */
  onClick?: (event: Event) => void
  /** Extra classes. */
  className?: string
}
