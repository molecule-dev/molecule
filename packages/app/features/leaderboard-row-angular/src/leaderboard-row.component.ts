/**
 * LeaderboardRow component (React parity).
 *
 * @module
 */

import { type AfterViewInit, Component, type ElementRef, signal, ViewChild } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Avatar } from '@molecule/app-ui-angular'

/**
 * Whether a wrapper element renders anything besides its static content: an
 * element child (a projected `[slot=<name>]` landed — the projection moves
 * into the view at render time) or non-empty text.
 *
 * @param el - The wrapper element.
 * @returns True when its children render anything.
 */
const hasRenderableContent = (el: HTMLElement): boolean =>
  Array.from(el.childNodes).some(
    (node) =>
      node.nodeType === Node.ELEMENT_NODE ||
      (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0),
  )

/** The medal emoji rendered in place of the rank for the top three. */
const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

/**
 * LeaderboardRow component.
 *
 * Leaderboard row — rank + avatar + name + score + optional rank-delta
 * arrow. Top 3 ranks render a medal in place of the numeric rank. The host IS
 * the row's root `<div>` (`div[mol-leaderboard-row]`), matching React's root
 * exactly. With `onClick` the row is promoted to a real button in the a11y
 * tree — `role="button"`, `tabindex="0"`, the pointer cursor — and Enter /
 * Space activate it (the click handler runs with no event), matching native
 * button keyboard semantics. When `name` is not a plain string the Avatar alt
 * falls back to hardcoded 'Player'. Same props, same DOM as
 * `@molecule/app-leaderboard-row-react`'s `LeaderboardRow`. Node-valued
 * `name`, `score` and `subtitle` content is projected (`[slot=<name>]`); a
 * string or number input renders as text. The optional subtitle span renders
 * optimistically so a projection can land, then withdraws at view init when
 * neither a text input nor a projection is present — React renders no span at
 * all for an absent or empty subtitle.
 */
@Component({
  selector: 'div[mol-leaderboard-row]',
  standalone: true,
  imports: [Avatar],
  inputs: [
    'rank',
    'name',
    'avatarSrc',
    'score',
    'rankDelta',
    'subtitle',
    'isMe',
    'onClick',
    'className',
  ],
  host: {
    '[class]': 'classes()',
    '[style.borderRadius]': "isMe ? '8px' : ''",
    '[attr.role]': 'role()',
    '[attr.tabindex]': 'tabindex()',
    '(click)': 'rowClick($event)',
    '(keydown)': 'handleKeyDown($event)',
  },
  // prettier-ignore
  template: `<span [class]="rankClass()" style="min-width: 32px">{{ rankText() }}</span>
    <div mol-avatar [src]="avatarSrc" [alt]="displayName()" [name]="displayName()" [size]="'sm'"></div>
    <div [class]="nameColumnClass()"><span [class]="nameClass()">@if (hasName) {<ng-container>{{ name }}</ng-container>}<ng-content select="[slot=name]" /></span>@if (showSubtitle) {<span #subtitleEl [class]="subtitleClass()">@if (hasSubtitle) {<ng-container>{{ subtitle }}</ng-container>}<ng-content select="[slot=subtitle]" /></span>}</div>
    @if (hasDelta) {<span [class]="deltaClass()">{{ deltaArrow() + ' ' + deltaText() }}</span>}
    <span [class]="scoreClass()">@if (hasScore) {<ng-container>{{ score }}</ng-container>}<ng-content select="[slot=score]" /></span>`,
})
export class LeaderboardRow implements AfterViewInit {
  /** 1-based rank. */
  rank?: number
  /** Display name: text, or `[slot=name]` content. */
  name?: unknown
  /** Optional avatar URL. */
  avatarSrc?: string
  /** Score / metric: text, or `[slot=score]` content. */
  score?: unknown
  /** Optional change indicator (positive = climbed). */
  rankDelta?: number
  /** Optional secondary line: text, or `[slot=subtitle]` content. */
  subtitle?: unknown
  /** Whether this row represents the current user (highlighted). */
  isMe?: boolean
  /** Click handler, called with the native click event; also runs, with no event, on Enter / Space. */
  onClick?: (event?: MouseEvent) => void
  /** Extra classes. */
  className?: string

  /** The optional subtitle span (projected content lands here). */
  @ViewChild('subtitleEl') private subtitleEl?: ElementRef<HTMLSpanElement>

  /** Whether a `[slot=subtitle]` projection landed (true until proven otherwise). */
  private readonly subtitleProjected = signal(true)

  /**
   * Withdraws the optimistic subtitle span when its slot projection did not
   * land: when neither a text input nor projected content is present, React
   * renders no span at all. View queries resolve at view init, and a
   * projected slot's content is in place by then.
   */
  ngAfterViewInit(): void {
    const subtitle = this.subtitleEl?.nativeElement
    if (subtitle && !this.hasSubtitle && !hasRenderableContent(subtitle)) {
      this.subtitleProjected.set(false)
    }
  }

  /**
   * Whether the row is interactive (`onClick` supplied): React renders the
   * button role, tab stop and pointer cursor only then.
   * @returns True when clickable.
   */
  interactive(): boolean {
    return typeof this.onClick === 'function'
  }

  /**
   * The host element's `role` (a button only when clickable).
   * @returns `'button'` or null for no attribute.
   */
  role(): string | null {
    return this.interactive() ? 'button' : null
  }

  /**
   * The host element's tab stop (only when clickable).
   * @returns 0 or null for no attribute.
   */
  tabindex(): number | null {
    return this.interactive() ? 0 : null
  }

  /**
   * Forwards a native click on the row to the `onClick` input (React calls
   * the handler with the event).
   * @param event - The native click event.
   */
  rowClick(event: MouseEvent): void {
    this.onClick?.(event)
  }

  /**
   * Activates the row on Enter / Space (React's `handleKeyDown`):
   * preventDefault, then the click handler with no event.
   * @param event - The keydown.
   */
  handleKeyDown(event: KeyboardEvent): void {
    const onClick = this.onClick
    if (!onClick) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick()
    }
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the row's root class list, with the pointer cursor only when an
   * `onClick` handler is set (React's conditional `cm.cursorPointer`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('px', 3),
      this.cm().sp('py', 2),
      this.onClick ? this.cm().cursorPointer : undefined,
      this.isMe ? this.cm().bgTone('info', { subtle: true }) : undefined,
      this.className,
    )
  }

  /**
   * The rank cell's class.
   * @returns The class string.
   */
  rankClass(): string {
    return this.cm().cn(this.cm().shrink0, this.cm().fontWeight('bold'), this.cm().textCenter)
  }

  /**
   * The rank cell's text: a medal for the top three, `#n` otherwise (React's
   * `MEDAL[rank] ?? '#' + rank`).
   * @returns The rank display.
   */
  rankText(): string {
    return MEDAL[this.rank as number] ?? `#${this.rank}`
  }

  /**
   * The Avatar's alt/name (React's `typeof name === 'string' ? name :
   * 'Player'`).
   * @returns The display name.
   */
  displayName(): string {
    return typeof this.name === 'string' ? this.name : 'Player'
  }

  /**
   * The name column's class.
   * @returns The class string.
   */
  nameColumnClass(): string {
    return this.cm().cn(this.cm().flex1, this.cm().stack(0 as const))
  }

  /**
   * The name span's class.
   * @returns The class string.
   */
  nameClass(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The subtitle span's class.
   * @returns The class string.
   */
  subtitleClass(): string {
    return this.cm().textSize('xs')
  }

  /**
   * Whether a text name input is present (a projected name is not).
   * @returns True when the name renders as text.
   */
  get hasName(): boolean {
    return this.name !== undefined && this.name !== null
  }

  /**
   * Whether a text score input is present (a projected score is not).
   * @returns True when the score renders as text.
   */
  get hasScore(): boolean {
    return this.score !== undefined && this.score !== null
  }

  /**
   * Whether the subtitle renders as text: React's `subtitle && …` truthiness.
   * @returns True when the subtitle text shows.
   */
  get hasSubtitle(): boolean {
    return this.subtitle !== undefined && this.subtitle !== null && this.subtitle !== ''
  }

  /**
   * Whether the subtitle span renders at all: the text input or projected
   * `[slot=subtitle]` content.
   * @returns True when the subtitle shows.
   */
  get showSubtitle(): boolean {
    return this.hasSubtitle || this.subtitleProjected()
  }

  /**
   * Whether a delta indicator renders: React's `rankDelta !== undefined &&
   * rankDelta !== 0` (a zero delta renders nothing).
   * @returns True when the ▲/▼ chip shows.
   */
  get hasDelta(): boolean {
    return this.rankDelta !== undefined && this.rankDelta !== 0
  }

  /**
   * The delta chip's class: the text size and weight, plus the semantic tone
   * (React's `cm.textTone(rankDelta > 0 ? 'success' : 'error')`).
   * @returns The class string.
   */
  deltaClass(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().fontWeight('semibold'),
      this.cm().textTone((this.rankDelta as number) > 0 ? 'success' : 'error'),
    )
  }

  /**
   * The delta's arrow (React's `rankDelta > 0 ? '▲' : '▼'`).
   * @returns The arrow character.
   */
  deltaArrow(): string {
    return (this.rankDelta as number) > 0 ? '▲' : '▼'
  }

  /**
   * The delta's magnitude (React's `Math.abs(rankDelta)`).
   * @returns The number of ranks climbed or dropped.
   */
  deltaText(): number {
    return Math.abs(this.rankDelta as number)
  }

  /**
   * The score span's class.
   * @returns The class string.
   */
  scoreClass(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('bold'))
  }
}
