/**
 * ThreadTree component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, TemplateRef } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { Comment, ThreadTreeProps } from './types.js'

/** Depth at which nodes start collapsed when the caller passes none. */
const DEFAULT_COLLAPSED_DEPTH = 4

/**
 * Indent step (rem) applied per depth level. Authored once here so the rest of
 * the component reads `INDENT_REM_PER_DEPTH * depth` and a future design tweak
 * only edits one constant.
 */
const INDENT_REM_PER_DEPTH = 1

/** Deepest level that still adds indentation. */
const MAX_INDENT_DEPTH = 8

/**
 * Next value of the module-wide replies-list id counter.
 *
 * React derives each replies-list id from `useId()`, which numbers ids from
 * one process-wide counter (`_r_<base32>_`). The id appears in the
 * `aria-controls` attribute and the replies `<ul>`'s `id`, which the
 * conformance normalizer renumbers in order of appearance, so the port
 * generates ids from the same kind of counter — unique per rendered node,
 * exactly React's format.
 */
let nextRepliesId = 0

/** Remembered replies-list ids, one per rendered comment object. */
const repliesIds = new WeakMap<Comment, string>()

/**
 * ThreadTree component.
 *
 * Recursive nested-comment tree with per-node collapse / expand, depth-based
 * indentation, and reply / upvote slots. The host IS React's root `<ul>`
 * (`ul[mol-thread-tree]`), matching React exactly. A recursive
 * `<ng-template>` renders each node, so the tree nests to any depth.
 *
 * All UI text resolves through `t()` so apps localise via the companion
 * `@molecule/app-locales-feature-thread-tree` package. All styling resolves
 * through `getClassMap()` — no Tailwind utilities live here.
 */
@Component({
  selector: 'ul[mol-thread-tree]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: [
    'comments',
    'onReply',
    'onUpvote',
    'onCollapse',
    'defaultCollapsedDepth',
    'className',
    'dataMolId',
  ],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': "dataMolId ?? 'thread-tree'",
  },
  template: `
    @for (comment of comments; track comment.id) {
      <ng-container
        [ngTemplateOutlet]="nodeTpl"
        [ngTemplateOutletContext]="contextOf(comment, 0)"
      ></ng-container>
    }
    <ng-template #nodeTpl let-comment let-depth="depth">
      <li
        [class]="stackClasses()"
        [attr.data-mol-id]="'thread-tree-comment-' + comment.id"
        [attr.data-thread-depth]="depth"
        [style.padding-left]="indentOf(depth)"
      >
        <article
          [class]="articleClasses()"
          [style.border-left]="depth > 0 ? '2px solid currentColor' : null"
          [style.padding-left]="depth > 0 ? '0.5rem' : null"
          [style.opacity]="depth > 0 ? 0.95 : null"
        >
          <header [class]="headerClasses()">
            <button
              type="button"
              (click)="toggle(comment.id)"
              [attr.data-mol-id]="'thread-tree-toggle-' + comment.id"
              [attr.aria-expanded]="collapsedOf(comment) ? 'false' : 'true'"
              [attr.aria-controls]="
                hasChildren(comment) && !collapsedOf(comment) ? repliesIdOf(comment) : null
              "
              [attr.aria-label]="toggleLabel(comment)"
              [class]="buttonClasses()"
              [textContent]="collapsedOf(comment) ? expandSymbol() : collapseSymbol()"
            ></button>
            @if (isNode(comment.author)) {
              <span [class]="authorClasses()"
                ><ng-container [ngTemplateOutlet]="templateOf(comment.author)"></ng-container
              ></span>
            } @else {
              <span [class]="authorClasses()" [textContent]="textOf(comment.author)"></span>
            }
            @if (hasScore(comment)) {
              <span [class]="metaClasses()" [textContent]="scoreText(comment)"></span>
            }
            @if (comment.createdAt) {
              <time
                [attr.datetime]="comment.createdAt"
                [class]="metaClasses()"
                [textContent]="comment.createdAt"
              ></time>
            }
            @if (collapsedOf(comment) && hiddenCountOf(comment) > 0) {
              <span [class]="metaClasses()" [textContent]="hiddenText(comment)"></span>
            }
          </header>
          @if (!collapsedOf(comment)) {
            @if (isPlain(comment.body)) {
              <p
                [class]="bodyClasses()"
                [style.white-space]="'pre-wrap'"
                [style.overflow-wrap]="'anywhere'"
                [textContent]="textOf(comment.body)"
              ></p>
            } @else if (isNode(comment.body)) {
              <div [class]="bodyClasses()">
                <ng-container [ngTemplateOutlet]="templateOf(comment.body)"></ng-container>
              </div>
            } @else {
              <div [class]="bodyClasses()" [textContent]="textOf(comment.body)"></div>
            }
            <div [class]="actionsClasses()">
              @if (onUpvote) {
                <button
                  type="button"
                  (click)="upvote(comment)"
                  [attr.data-mol-id]="'thread-tree-upvote-' + comment.id"
                  [attr.aria-pressed]="comment.upvoted ? 'true' : 'false'"
                  [attr.aria-label]="upvoteText()"
                  [class]="buttonClasses()"
                  [textContent]="upvoteText()"
                ></button>
              }
              @if (onReply) {
                <button
                  type="button"
                  (click)="reply(comment.id)"
                  [attr.data-mol-id]="'thread-tree-reply-' + comment.id"
                  [attr.aria-label]="replyText()"
                  [class]="buttonClasses()"
                  [textContent]="replyText()"
                ></button>
              }
            </div>
          }
        </article>
        @if (hasChildren(comment) && !collapsedOf(comment)) {
          <!-- A comment thread is nested lists, not an ARIA tree widget: plain
          ul/li semantics (with the toggle's aria-expanded + aria-controls
          carrying the state), so every li keeps its listitem role and no tree
          keyboard model is implied. -->
          <ul [attr.id]="repliesIdOf(comment)" [class]="stackClasses()">
            @for (child of childrenOf(comment); track child.id) {
              <ng-container
                [ngTemplateOutlet]="nodeTpl"
                [ngTemplateOutletContext]="contextOf(child, depth + 1)"
              ></ng-container>
            }
          </ul>
        }
      </li>
    </ng-template>
  `,
})
export class ThreadTree {
  /** Top-level comments. Each may carry nested `children`. */
  comments: Comment[] = []
  /** Reply-button handler — receives the comment id. */
  onReply?: ThreadTreeProps['onReply']
  /** Upvote-button handler — receives the comment id and the next state. */
  onUpvote?: ThreadTreeProps['onUpvote']
  /** Optional handler called when a node is collapsed or expanded. */
  onCollapse?: ThreadTreeProps['onCollapse']
  /** Depth at which nodes auto-collapse (React's default `4` applied at read time). */
  defaultCollapsedDepth?: number
  /** Extra classes appended to the outer wrapper. */
  className?: string
  /** `data-mol-id` selector for AI-agent interaction. */
  dataMolId?: string

  /** The ids currently collapsed. React's `useState` set, read once at init. */
  private collapsedIds = new Set<string>()

  /** Reactive translation, read in the injection context. */
  private readonly i18n = useTranslation()

  /**
   * Builds the initial collapsed set from the first render's inputs, exactly as
   * React's `useState(() => computeInitialCollapsed(...))` does: a later change
   * of `comments` or `defaultCollapsedDepth` does not reset it.
   */
  ngOnInit(): void {
    this.collapsedIds = this.computeInitialCollapsed(
      this.comments,
      this.defaultCollapsedDepth ?? DEFAULT_COLLAPSED_DEPTH,
    )
  }

  /**
   * Compute a flat set of node ids that should start collapsed based on the
   * configured `defaultCollapsedDepth`. Walks the tree once.
   *
   * @param nodes - Top-level comments.
   * @param threshold - Depth at which nodes are auto-collapsed.
   * @returns A `Set` of comment ids that should start collapsed.
   */
  private computeInitialCollapsed(nodes: Comment[], threshold: number): Set<string> {
    const collapsed = new Set<string>()
    const visit = (list: Comment[], depth: number): void => {
      for (const node of list) {
        if (depth >= threshold && node.children && node.children.length > 0) collapsed.add(node.id)
        if (node.children && node.children.length > 0) visit(node.children, depth + 1)
      }
    }
    visit(nodes, 0)
    return collapsed
  }

  /**
   * Flips one node's collapsed state and reports the new state, as React's
   * `onToggleCollapse` does.
   *
   * @param commentId - The node to toggle.
   */
  toggle(commentId: string): void {
    const wasCollapsed = this.collapsedIds.has(commentId)
    const next = new Set(this.collapsedIds)
    if (wasCollapsed) next.delete(commentId)
    else next.add(commentId)
    this.collapsedIds = next
    this.onCollapse?.(commentId, !wasCollapsed)
  }

  /**
   * Calls the reply handler for a node, as React's reply button does.
   *
   * @param commentId - The node's id.
   */
  reply(commentId: string): void {
    this.onReply?.(commentId)
  }

  /**
   * Calls the upvote handler with the node's next state, as React's upvote
   * button does.
   *
   * @param comment - The node.
   */
  upvote(comment: Comment): void {
    this.onUpvote?.(comment.id, !comment.upvoted)
  }

  /**
   * The template context one node renders with.
   *
   * @param comment - The comment.
   * @param depth - Its depth.
   * @returns The context (`$implicit` is the comment).
   */
  contextOf(comment: Comment, depth: number): { $implicit: Comment; depth: number } {
    return { $implicit: comment, depth }
  }

  /**
   * The stable id of a node's replies list, as React's `useId()` provides per
   * rendered node. Angular renders every node through one shared template, so
   * there is no component instance to ask: the id is assigned once per comment
   * object from a module-wide counter (React's id shape) and remembered —
   * never derived from the comment's data.
   *
   * @param comment - The node.
   * @returns The replies list's id.
   */
  repliesIdOf(comment: Comment): string {
    let id = repliesIds.get(comment)
    if (!id) {
      id = `_r_${(nextRepliesId++).toString(32)}_`
      repliesIds.set(comment, id)
    }
    return id
  }

  /**
   * Whether a node is collapsed right now.
   *
   * @param comment - The node.
   * @returns True when collapsed.
   */
  collapsedOf(comment: Comment): boolean {
    return this.collapsedIds.has(comment.id)
  }

  /**
   * Whether the node has children to show behind the toggle.
   *
   * @param comment - The node.
   * @returns True when it has direct children.
   */
  hasChildren(comment: Comment): boolean {
    return !!(comment.children && comment.children.length > 0)
  }

  /**
   * The node's children.
   *
   * @param comment - The node.
   * @returns Its direct children (empty when none).
   */
  childrenOf(comment: Comment): Comment[] {
    return comment.children ?? []
  }

  /**
   * Count the total number of descendant comments in a sub-tree
   * (recursively), used for the "N replies hidden" affordance.
   *
   * @param children - Direct children of the collapsed node.
   * @returns Total descendant count.
   */
  countDescendants(children: Comment[] | undefined): number {
    if (!children || children.length === 0) return 0
    let total = 0
    for (const child of children) total += 1 + this.countDescendants(child.children)
    return total
  }

  /**
   * Descendants hidden behind a collapsed node (0 while expanded).
   *
   * @param comment - The node.
   * @returns The hidden descendant count.
   */
  hiddenCountOf(comment: Comment): number {
    return this.collapsedOf(comment) ? this.countDescendants(comment.children) : 0
  }

  /**
   * Whether a field holds a node (an `ng-template` reference) rather than text.
   *
   * @param value - The field.
   * @returns True when it renders through a template outlet.
   */
  isNode(value: unknown): value is TemplateRef<unknown> {
    return value instanceof TemplateRef
  }

  /**
   * Narrows a value to an embedded template.
   *
   * @param value - A node field.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * Whether a body is plain text (React renders it in a `<p>`).
   *
   * @param value - The body.
   * @returns True for a string body.
   */
  isPlain(value: unknown): boolean {
    return typeof value === 'string'
  }

  /**
   * The text a field renders (React renders strings and numbers as text).
   *
   * @param value - The field.
   * @returns The text, or `''` for a node or absent field.
   */
  textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  /**
   * Whether the node shows a score (React's `typeof score === 'number'`).
   *
   * @param comment - The node.
   * @returns True when it has a numeric score.
   */
  hasScore(comment: Comment): boolean {
    return typeof comment.score === 'number'
  }

  /**
   * The score label, through `t()`.
   *
   * @param comment - The node.
   * @returns The translated score text.
   */
  scoreText(comment: Comment): string {
    return this.i18n.t(
      'threadTree.score',
      { count: comment.score ?? 0 },
      { defaultValue: '{{count}} points' },
    )
  }

  /**
   * The hidden-replies label, through `t()`.
   *
   * @param comment - The node.
   * @returns The translated hidden count.
   */
  hiddenText(comment: Comment): string {
    return this.i18n.t(
      'threadTree.hiddenReplies',
      { count: this.hiddenCountOf(comment) },
      { defaultValue: '{{count}} hidden' },
    )
  }

  /**
   * The toggle button's `aria-label`, through `t()`.
   *
   * @param comment - The node.
   * @returns The translated label.
   */
  toggleLabel(comment: Comment): string {
    return this.collapsedOf(comment)
      ? this.i18n.t(
          'threadTree.expand',
          { count: this.hiddenCountOf(comment) },
          { defaultValue: 'Expand {{count}} replies' },
        )
      : this.i18n.t('threadTree.collapse', {}, { defaultValue: 'Collapse thread' })
  }

  /**
   * The expand affordance's text, through `t()`.
   *
   * @returns The translated expand symbol.
   */
  expandSymbol(): string {
    return this.i18n.t('threadTree.expandSymbol', {}, { defaultValue: '[+]' })
  }

  /**
   * The collapse affordance's text, through `t()`.
   *
   * @returns The translated collapse symbol.
   */
  collapseSymbol(): string {
    return this.i18n.t('threadTree.collapseSymbol', {}, { defaultValue: '[−]' })
  }

  /**
   * The upvote label, through `t()`.
   *
   * @returns The translated upvote text.
   */
  upvoteText(): string {
    return this.i18n.t('threadTree.upvote', {}, { defaultValue: 'Upvote' })
  }

  /**
   * The reply label, through `t()`.
   *
   * @returns The translated reply text.
   */
  replyText(): string {
    return this.i18n.t('threadTree.reply', {}, { defaultValue: 'Reply' })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The left indent for a node at this depth.
   *
   * @param depth - The node's depth.
   * @returns The indent in rem (clamped at the deepest step).
   */
  indentOf(depth: number): string {
    return `${Math.min(depth, MAX_INDENT_DEPTH) * INDENT_REM_PER_DEPTH}rem`
  }

  /**
   * Computes the outer wrapper's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(2), this.className)
  }

  /**
   * Computes a list container's class list.
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().cn(this.cm().stack(1))
  }

  /**
   * Computes the node article's class list.
   * @returns The class string.
   */
  articleClasses(): string {
    return this.cm().cn(this.cm().stack(1), this.cm().sp('py', 2))
  }

  /**
   * Computes the header row's class list.
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * Computes the author label's class list.
   * @returns The class string.
   */
  authorClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * Computes a meta label's class list.
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().textMuted)
  }

  /**
   * Computes the body's class list.
   * @returns The class string.
   */
  bodyClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().sp('m', 0))
  }

  /**
   * Computes the action row's class list.
   * @returns The class string.
   */
  actionsClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * Computes a button's class list.
   * @returns The class string.
   */
  buttonClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.cursorPointer)
  }
}
