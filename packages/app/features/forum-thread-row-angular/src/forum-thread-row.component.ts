/**
 * ForumThreadRow component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasProjectedSlot, SlotGuard } from './slot-dom.js'

/** Next value of the module-wide instance counter (React `useId()`'s counterpart). */
let nextNameId = 0

/**
 * ForumThreadRow component.
 *
 * Forum / discussion-board thread row. Shows the title, optional excerpt, vote
 * score + reply/view counts, pin/lock badges, author, and timestamp. With an
 * `onClick` the whole row is clickable through a transparent native button
 * laid over it (Enter and Space activate it natively), named by the title —
 * the `<h3>` itself takes the generated id; the `voteControls` and `tags`
 * wrappers sit above that button and keep their own clicks. The host
 * IS the root `<article>` (`article[mol-forum-thread-row]`), matching React's
 * root exactly. The marker labels ("Pinned" / "Locked", announced through
 * `role="img"` + `aria-label`) and the counter labels ("votes",
 * "{{count}} replies", "{{count}} views") go through `t()` with those English
 * defaults — the same text, through the same keys, React renders.
 *
 * The node props are projected slots: `title`, `excerpt`, `author`,
 * `createdAt`, `tags` and `voteControls` each render inside the wrapper
 * element React renders for them. String inputs render as text instead —
 * React's truthiness branch applies: an empty string renders nothing. The
 * capture wrappers reconcile against that in {@link ForumThreadRow.ngDoCheck}.
 */
@Component({
  selector: 'article[mol-forum-thread-row]',
  standalone: true,
  inputs: [
    'title',
    'excerpt',
    'voteScore',
    'replyCount',
    'viewCount',
    'pinned',
    'locked',
    'author',
    'createdAt',
    'tags',
    'voteControls',
    'onClick',
    'className',
  ],
  host: {
    '[class]': 'classes()',
  },
  template: `@if (onClick) {
      <button
        type="button"
        [attr.aria-labelledby]="nameId"
        data-mol-id="forum-thread-row-open"
        (click)="handleClick()"
        [class]="openButtonClasses()"
        style="background: transparent; border: medium; padding: 0px"
      ></button>
    }
    <div #voteControlsWrap [class]="voteControlsClasses()">
      {{ voteControlsText() }}
      <ng-content select="[slot=voteControls]"></ng-content>
    </div>
    <div #scoreWrap [class]="scoreClasses()">
      <span [class]="scoreValueClasses()">{{ voteScore }}</span>
      <span [class]="scoreLabelClasses()">{{ votesText() }}</span>
    </div>
    <div [class]="stackClasses()">
      <header [class]="headerClasses()">
        @if (pinned) {
          <span role="img" [attr.aria-label]="pinnedText()" [title]="pinnedText()">📌</span>
        }
        @if (locked) {
          <span role="img" [attr.aria-label]="lockedText()" [title]="lockedText()">🔒</span>
        }
        <h3 [attr.id]="onClick ? nameId : null" [class]="titleClasses()">
          {{ titleText() }}
          <ng-content select="[slot=title]"></ng-content>
        </h3>
      </header>
      <p #excerptWrap [class]="excerptClasses()">
        {{ excerptText() }}
        <ng-content select="[slot=excerpt]"></ng-content>
      </p>
      <div [class]="metaClasses()">
        <span #authorWrap [class]="authorClasses()">
          {{ authorText() }}
          <ng-content select="[slot=author]"></ng-content>
        </span>
        <span #createdAtWrap [class]="createdAtClasses()">
          · {{ createdAtText() }}
          <ng-content select="[slot=createdAt]"></ng-content>
        </span>
        @if (repliesText() !== undefined) {
          <span [class]="countClasses()">· {{ repliesText() }}</span>
        }
        @if (viewsText() !== undefined) {
          <span [class]="countClasses()">· {{ viewsText() }}</span>
        }
      </div>
      <div #tagsWrap [class]="tagsClasses()">
        {{ tagsText() }}
        <ng-content select="[slot=tags]"></ng-content>
      </div>
    </div>`,
})
export class ForumThreadRow implements AfterViewInit, DoCheck {
  /** Thread title (string/number renders as text; nodes are `[slot=title]` content). */
  title?: unknown
  /** Optional snippet of the OP body (string as text; nodes are `[slot=excerpt]` content). */
  excerpt?: unknown
  /** Aggregate vote score / upvotes (React's `!== undefined` branch). */
  voteScore?: number
  /** Reply count (React's `!== undefined` branch). */
  replyCount?: number
  /** View count (React's `!== undefined` branch). */
  viewCount?: number
  /** Optional pinned indicator. */
  pinned?: boolean
  /** Optional locked indicator. */
  locked?: boolean
  /** Author display (string as text; nodes are `[slot=author]` content). */
  author?: unknown
  /** Created-at display (string as text; nodes are `[slot=createdAt]` content). */
  createdAt?: unknown
  /** Tag chips (string as text; nodes are `[slot=tags]` content). */
  tags?: unknown
  /** Right-side voting controls (string as text; nodes are `[slot=voteControls]` content). */
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

  /**
   * The row's generated id (React's `useId()`): the title `<h3>`'s `id`, and
   * the open button's `aria-labelledby`, so the button's accessible name is
   * the thread title.
   */
  readonly nameId = `forum-thread-row-${nextNameId++}`

  /** The vote-controls wrapper `<div>` (detached when the slot is empty). */
  @ViewChild('voteControlsWrap') voteControlsWrap?: ElementRef<HTMLElement>
  /** The score `<div>` (detached when React would not render it). */
  @ViewChild('scoreWrap') scoreWrap?: ElementRef<HTMLElement>
  /** The excerpt `<p>` (detached when no excerpt input and the slot is empty). */
  @ViewChild('excerptWrap') excerptWrap?: ElementRef<HTMLElement>
  /** The author `<span>` (detached when no author input and the slot is empty). */
  @ViewChild('authorWrap') authorWrap?: ElementRef<HTMLElement>
  /** The created-at `<span>` (detached when no createdAt input and the slot is empty). */
  @ViewChild('createdAtWrap') createdAtWrap?: ElementRef<HTMLElement>
  /** The tags wrapper `<div>` (detached when no tags input and the slot is empty). */
  @ViewChild('tagsWrap') tagsWrap?: ElementRef<HTMLElement>

  private readonly renderer = inject(Renderer2)

  private readonly guard = new SlotGuard(inject(ElementRef), this.renderer)

  /** The i18n bond (React's `useTranslation`): the row's own text reads through it. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the row's class list (`cm.flex({ align: 'start', gap: 'sm' })` +
   * `cm.sp('p', 3)` + `cm.position('relative')` with an `onClick` — the open
   * button overlays it — + `className`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'start', gap: 'sm' }),
      this.cm().sp('p', 3),
      this.onClick ? this.cm().position('relative') : undefined,
      this.className,
    )
  }

  /**
   * Computes the open button's class (`cm.position('absolute')` + `cm.inset0`
   * + `cm.cursorPointer`): a transparent button over the whole row. Its style
   * attribute carries the native resets in React's CSSOM-serialized form
   * (`border: medium; padding: 0px` — React's shorthand `border: 'none'` and
   * `padding: 0` serialize to exactly that), so the DOM matches.
   * @returns The class string.
   */
  openButtonClasses(): string {
    return this.cm().cn(this.cm().position('absolute'), this.cm().inset0, this.cm().cursorPointer)
  }

  /**
   * Computes the vote-controls wrapper's class (`cm.shrink0`, plus
   * `cm.position('relative')` with an `onClick` so it paints above the open
   * button and keeps its own clicks).
   * @returns The class string.
   */
  voteControlsClasses(): string {
    return this.cm().cn(
      this.cm().shrink0,
      this.onClick ? this.cm().position('relative') : undefined,
    )
  }

  /**
   * Computes the score block's class (`cm.shrink0` + `cm.textCenter` +
   * `cm.stack(0)`).
   * @returns The class string.
   */
  scoreClasses(): string {
    return this.cm().cn(this.cm().shrink0, this.cm().textCenter, this.cm().stack(0))
  }

  /**
   * Computes the score value's class (`cm.textSize('sm')` +
   * `cm.fontWeight('bold')`).
   * @returns The class string.
   */
  scoreValueClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('bold'))
  }

  /**
   * Computes the "votes" label's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  scoreLabelClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * The pinned marker's label (aria-label and title), through `t()`.
   * @returns The translated label.
   */
  pinnedText(): string {
    return this.i18n.t('forumThreadRow.aria.pinned', undefined, { defaultValue: 'Pinned' })
  }

  /**
   * The locked marker's label (aria-label and title), through `t()`.
   * @returns The translated label.
   */
  lockedText(): string {
    return this.i18n.t('forumThreadRow.aria.locked', undefined, { defaultValue: 'Locked' })
  }

  /**
   * The vote score's label, through `t()`.
   * @returns The translated label.
   */
  votesText(): string {
    return this.i18n.t('forumThreadRow.label.votes', undefined, { defaultValue: 'votes' })
  }

  /**
   * The reply count's text (`{{count}} replies`), through `t()`.
   * @returns The translated text, or `undefined` when `replyCount` is absent.
   */
  repliesText(): string | undefined {
    return this.replyCount === undefined
      ? undefined
      : this.i18n.t(
          'forumThreadRow.label.replies',
          { count: this.replyCount },
          {
            defaultValue: '{{count}} replies',
          },
        )
  }

  /**
   * The view count's text (`{{count}} views`), through `t()`.
   * @returns The translated text, or `undefined` when `viewCount` is absent.
   */
  viewsText(): string | undefined {
    return this.viewCount === undefined
      ? undefined
      : this.i18n.t(
          'forumThreadRow.label.views',
          { count: this.viewCount },
          {
            defaultValue: '{{count}} views',
          },
        )
  }

  /**
   * Computes the stack's class (`cm.flex1` + `cm.stack(1)`).
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(1))
  }

  /**
   * Computes the header's class (`cm.flex({ align: 'center', gap: 'sm',
   * wrap: 'wrap' })`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * Computes the title's class (`cm.textSize('base')` +
   * `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('base'), this.cm().fontWeight('semibold'))
  }

  /**
   * Computes the excerpt's class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  excerptClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'))
  }

  /**
   * Computes the meta row's class (`cm.flex({ align: 'center', gap: 'sm',
   * wrap: 'wrap' })`).
   * @returns The class string.
   */
  metaClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm', wrap: 'wrap' })
  }

  /**
   * Computes the author span's class (`cm.textSize('xs')` +
   * `cm.fontWeight('semibold')`).
   * @returns The class string.
   */
  authorClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('semibold'))
  }

  /**
   * Computes the created-at span's class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  createdAtClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * Computes the reply/view count spans' class (`cm.textSize('xs')`).
   * @returns The class string.
   */
  countClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'))
  }

  /**
   * Computes the tags row's class (`cm.flex({ align: 'center', gap: 'xs',
   * wrap: 'wrap' })`, plus `cm.position('relative')` with an `onClick` so it
   * paints above the open button and keeps its own clicks).
   * @returns The class string.
   */
  tagsClasses(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
      this.onClick ? this.cm().position('relative') : undefined,
    )
  }

  /**
   * The input's text (React's `{expr}` for a text child: strings and numbers
   * render; a node arrives as `[slot=<name>]` content instead).
   * @param value - The input value.
   * @returns The text, or `''` for a node value.
   */
  private textOf(value: unknown): string {
    return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
  }

  /**
   * The title input's text.
   * @returns The text, or `''` for a node title.
   */
  titleText(): string {
    return this.textOf(this.title)
  }

  /**
   * The excerpt input's text.
   * @returns The text, or `''` for a node value.
   */
  excerptText(): string {
    return this.textOf(this.excerpt)
  }

  /**
   * The author input's text.
   * @returns The text, or `''` for a node value.
   */
  authorText(): string {
    return this.textOf(this.author)
  }

  /**
   * The createdAt input's text.
   * @returns The text, or `''` for a node value.
   */
  createdAtText(): string {
    return this.textOf(this.createdAt)
  }

  /**
   * The tags input's text.
   * @returns The text, or `''` for a node value.
   */
  tagsText(): string {
    return this.textOf(this.tags)
  }

  /**
   * The voteControls input's text.
   * @returns The text, or `''` for a node value.
   */
  voteControlsText(): string {
    return this.textOf(this.voteControls)
  }

  /**
   * Whether React would render the vote-controls wrapper: a text value or
   * projected slot content.
   * @returns True when vote controls are present.
   */
  private hasVoteControls(): boolean {
    return this.voteControlsText() !== '' || hasProjectedSlot(this.voteControlsWrap?.nativeElement)
  }

  /** Opens the row: calls `onClick` with no arguments, as React's button does. */
  handleClick(): void {
    this.onClick?.()
  }

  /**
   * Reconciles the wrappers once the view queries resolve.
   */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /**
   * Re-reconciles on later passes (a props step may add an excerpt or an
   * author, or empty a previously set value, which React re-renders).
   */
  ngDoCheck(): void {
    this.reconcile()
  }

  /**
   * Applies React's conditions: the vote-controls wrapper renders when the
   * string input is non-empty or the slot holds projected content; the score
   * block renders when `voteScore !== undefined` and no vote controls are
   * supplied; each text-node wrapper renders when its value is truthy or the
   * slot holds projected content. Re-read every pass, so a props step that
   * empties a previously set value drops the wrapper.
   */
  private reconcile(): void {
    const hasVoteControls = this.hasVoteControls()
    this.guard.toggle(this.voteControlsWrap?.nativeElement, hasVoteControls)
    this.guard.toggle(
      this.scoreWrap?.nativeElement,
      this.voteScore !== undefined && !hasVoteControls,
    )
    const excerpt = this.excerptWrap?.nativeElement
    const author = this.authorWrap?.nativeElement
    const createdAt = this.createdAtWrap?.nativeElement
    const tags = this.tagsWrap?.nativeElement
    this.guard.toggle(excerpt, this.excerptText() !== '' || hasProjectedSlot(excerpt))
    this.guard.toggle(author, this.authorText() !== '' || hasProjectedSlot(author))
    this.guard.toggle(createdAt, this.createdAtText() !== '' || hasProjectedSlot(createdAt))
    this.guard.toggle(tags, this.tagsText() !== '' || hasProjectedSlot(tags))
  }
}
