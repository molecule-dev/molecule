/**
 * Types of `@molecule/app-feature-thread-tree-angular` — the Angular
 * counterpart of `@molecule/app-feature-thread-tree-react`, same props and DOM.
 *
 * @module
 */

import type { TemplateRef } from '@angular/core'

/**
 * A node value: plain text, a number, or an embedded template rendered through
 * `NgTemplateOutlet` (what a node value becomes in Angular).
 */
type NodeValue = string | number | TemplateRef<unknown>

/**
 * A single comment node in the tree. Apps own the data shape — the component
 * reads `id`, `children`, and renders the rest.
 */
export interface Comment {
  /** Stable, unique identifier used as the `@for` track key + collapse-state key. */
  id: string
  /** Author display name / handle. */
  author: NodeValue
  /**
   * Plain strings render as complete, escaped paragraphs with line breaks and
   * long-word wrapping. Rich content keeps a block container, so callers can
   * supply their own paragraphs, lists or other structured content.
   */
  body: NodeValue
  /**
   * Timestamp string rendered VERBATIM in a `<time>` element — pass a
   * pre-formatted display string (e.g. "2 hours ago"); an ISO string will be
   * shown raw to users. Also used as the `datetime` attribute. Omit to hide
   * the timestamp.
   */
  createdAt?: string
  /** Score / upvote count. Optional — omit to hide the count display. */
  score?: number
  /** Whether the current viewer has upvoted this comment. */
  upvoted?: boolean
  /** Direct child comments (the recursive payload). */
  children?: Comment[]
}

/**
 * Props accepted by {@link ThreadTree} — the same props
 * `@molecule/app-feature-thread-tree-react` accepts. Node values inside
 * `comments` are embedded templates (`ng-template` references).
 */
export interface ThreadTreeProps {
  /** Top-level comments. Each may carry nested `children`. */
  comments: Comment[]
  /** Reply-button handler — receives the comment id. */
  onReply?: (commentId: string) => void
  /** Upvote-button handler — receives the comment id and the next state. */
  onUpvote?: (commentId: string, next: boolean) => void
  /** Optional handler called when a node is collapsed or expanded. */
  onCollapse?: (commentId: string, collapsed: boolean) => void
  /**
   * Comments at this depth (0-indexed) start collapsed by default.
   * Defaults to `4`. Pass `Infinity` to start fully expanded.
   */
  defaultCollapsedDepth?: number
  /** Extra classes appended to the outer wrapper. */
  className?: string
  /** `data-mol-id` selector for AI-agent interaction. */
  dataMolId?: string
}
