/**
 * Expandable commit card for the chat timeline.
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `CommitCardItem` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. The label renders the commit message
 * with any trailing `Co-authored-by:` attribution trailer STRIPPED through the
 * shared `stripCommitCoauthorTrailer` — the endpoint returns the full git
 * message, and that attribution is noise the user never wrote. Clicking the row
 * discloses the committed files; the icon-only revert control is a SIBLING of
 * the row button (a control cannot sit inside it — axe nested-interactive) and
 * keeps its own hover state so leaving the row does not hide it under the
 * pointer.
 *
 * The component is a part (React renders it inside ChatPanel without exporting
 * it), so it lives in `src/parts/`.
 *
 * React's `useState` values are signals here: the revert state changes AFTER
 * the host's promise settles, and a plain field written in a promise
 * continuation would never schedule the zoneless change detection that renders
 * the control's new title and opacity. Styling uses `getClassMap()` (`cm.*`);
 * the inline styles are the ones React writes (status dot, row geometry,
 * disclosure, the revert control's hover fill), serialized through `styleText`.
 * All user-facing text goes through `t()`. The coarse-pointer width/height and
 * the resting opacity come from the same viewport hook React reads.
 *
 * @module
 */

import { Component, signal } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import { TIMELINE_ITEM_GAP } from '@molecule/app-ide-panel-logic'
import type { CommitCard } from '@molecule/app-ide-panel-logic/panels'
import { stripCommitCoauthorTrailer } from '@molecule/app-ide-panel-logic/panels'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import { useCoarsePointer } from '../hooks/useViewport.js'

export type { CommitCard }

/** Props for {@link CommitCardItem} — the React prop names, React's own contract. */
export interface CommitCardItemProps {
  /** The commit to render. */
  card: CommitCard
  /** Reverts the commit; resolves to the revert commit's hash (offers redo). */
  onRevert?: (hash: string) => Promise<string | undefined>
}

/** The monospace figure stack React writes for the commit message. */
const MONO_FONT = '"SF Mono", Menlo, Consolas, "Courier New", monospace'

/** The revert fill React writes on hover. */
const REVERT_HOVER_BACKGROUND = 'rgba(128,128,128,0.2)'

/** The revert fill React leaves behind once the pointer has left it. */
const REVERT_RESTING_BACKGROUND = 'transparent'

/**
 * Expandable tool-call-style card displaying a commit with its files.
 */
@Component({
  selector: 'div[mol-commit-card-item]',
  standalone: true,
  inputs: ['card', 'onRevert'],
  host: { '[attr.style]': 'outerStyle' },
  // prettier-ignore
  template: `<div [attr.style]="innerStyle">
  <button type="button" [attr.style]="headerStyle()" (click)="toggle()" (mouseenter)="hovered.set(true)" (mouseleave)="hovered.set(false)">
    <svg width="10" height="10" viewBox="0 0 10 10" [attr.style]="dotWrapStyle"><circle cx="5" cy="5" r="3" [attr.fill]="dotColor()" opacity="0.35"></circle><circle cx="5" cy="5" r="3" fill="none" [attr.stroke]="dotColor()" stroke-width="2"></circle></svg>
    <span [attr.style]="labelWrapStyle()">
      <span [attr.style]="labelInnerStyle()">
        <span [attr.style]="labelWrapStyle()">@if (isRunning()) {{{ committingLabel() }}} @else {{{ commitLabel() + ' ' }}<code [attr.style]="codeStyle">{{ message() }}</code>}</span>
      </span>
      @if (hasFiles() && !expanded()) {<span [class]="fileCountClass" [attr.style]="fileCountStyle">{{ fileCountLabel() }}</span>}
    </span>
    @if (hasFiles()) {<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="14" height="14" [attr.style]="chevronStyle()"><polyline points="6,4 10,8 6,12" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>}
  </button>
  @if (canRevert()) {<span role="button" [attr.tabindex]="0" [attr.title]="revertTitle()" (click)="handleRevert($event)" (keydown)="onRevertKeydown($event)" (mouseenter)="onRevertEnter($event)" (mouseleave)="onRevertLeave($event)" [style.display]="'inline-flex'" [style.align-items]="'center'" [style.justify-content]="'center'" [style.align-self]="'flex-start'" [style.width]="revertSizeText()" [style.height]="revertSizeText()" [style.border-radius]="'4px'" [style.flex-shrink]="'0'" [style.cursor]="revertCursor()" [style.transition]="'opacity 100ms, background 100ms'" [style.opacity]="revertOpacity()"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" width="13" height="13" fill="currentColor">@if (isReverted()) {<path d="M14.78 6.28a.749.749 0 0 0 0-1.06l-3.5-3.5a.749.749 0 1 0-1.06 1.06L12.439 5H5.251l-.001.007L5.251 5a.8.8 0 0 0-.171.019A4.501 4.501 0 0 0 5.5 14h1.704a.75.75 0 0 0 0-1.5H5.5a3 3 0 1 1 0-6h6.939L10.22 8.72a.749.749 0 1 0 1.06 1.06l3.5-3.5Z"></path>} @else {<path d="M1.22 6.28a.749.749 0 0 1 0-1.06l3.5-3.5a.749.749 0 1 1 1.06 1.06L3.561 5h7.188l.001.007L10.749 5c.058 0 .116.007.171.019A4.501 4.501 0 0 1 10.5 14H8.796a.75.75 0 0 1 0-1.5H10.5a3 3 0 1 0 0-6H3.561L5.78 8.72a.749.749 0 1 1-1.06 1.06l-3.5-3.5Z"></path>}</svg></span>}
  @if (expanded() && hasFiles()) {<div [class]="cm.surfaceSecondary" [attr.style]="detailStyle"><div [attr.style]="fileListStyle">@for (file of card.files; track file) {<div>{{ file }}</div>}</div></div>}
</div>`,
})
export class CommitCardItem {
  /** The commit to render. */
  card!: CommitCard

  /** Reverts the commit; resolves to the revert commit's hash (offers redo). */
  onRevert?: (hash: string) => Promise<string | undefined>

  /** Whether the committed files are disclosed. */
  readonly expanded = signal(false)

  /** Whether the row is hovered (the disclosure's opacity). */
  readonly hovered = signal(false)

  /** Whether a revert request is in flight. */
  readonly isReverting = signal(false)

  /** Whether the commit has been reverted (the control now re-applies it). */
  readonly isReverted = signal(false)

  /** The revert commit's hash, so the undo itself can be undone. */
  readonly revertHash = signal<string | undefined>(undefined)

  /** Whether the revert control itself is hovered (it keeps itself revealed). */
  readonly revertHovered = signal(false)

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** The translation handle (locale-reactive). */
  private readonly i18n = useTranslation()

  /** Whether the primary pointer is coarse (React's `useCoarsePointer`). */
  private readonly coarse = useCoarsePointer()

  /** The card's bottom rhythm. */
  protected readonly outerStyle = styleText({ marginBottom: TIMELINE_ITEM_GAP })

  /** The header row's placement. */
  protected readonly innerStyle = styleText({
    marginBottom: 4,
    display: 'flex',
    alignItems: 'flex-start',
  })

  /** The status dot's placement. */
  protected readonly dotWrapStyle = styleText({ flexShrink: 0, marginTop: 5 })

  /** The disclosed file list's chrome. */
  protected readonly detailStyle = styleText({
    marginLeft: 14,
    marginTop: 4,
    marginBottom: 4,
    borderRadius: 4,
    overflowX: 'auto',
    padding: '6px 10px',
  })

  /** The file list's mono type. */
  protected readonly fileListStyle = styleText({
    fontFamily: MONO_FONT,
    fontSize: 11,
    lineHeight: 1.6,
  })

  /** The commit message's mono type. */
  protected readonly codeStyle = styleText({ fontFamily: MONO_FONT, fontSize: 'inherit' })

  /** The file-count line's placement. */
  protected readonly fileCountStyle = styleText({ display: 'block', marginTop: 1 })

  /** The file-count line's ClassMap classes. */
  protected readonly fileCountClass: string

  /** Composes the file-count line's classes once. */
  constructor() {
    this.fileCountClass = this.cm.cn(this.cm.textMuted, this.cm.textSize('xs'))
  }

  /** Toggles the committed-files disclosure (a row without files is inert). */
  toggle(): void {
    if (!this.hasFiles()) return
    this.expanded.update((value) => !value)
  }

  /**
   * Whether the card has committed files to disclose.
   *
   * @returns True when the card carries files.
   */
  protected hasFiles(): boolean {
    return this.card.files.length > 0
  }

  /**
   * Whether the commit is still running.
   *
   * @returns True while the commit is in flight.
   */
  protected isRunning(): boolean {
    return this.card.status === 'running'
  }

  /**
   * Whether the revert control renders: a done commit with a hash (or a revert
   * commit that can itself be undone) and a host that can revert it.
   *
   * @returns True when the control shows.
   */
  protected canRevert(): boolean {
    if (this.card.status !== 'done' || !this.onRevert) return false
    return !!(this.isReverted() ? this.revertHash() : this.card.hash)
  }

  /**
   * The status dot's colour.
   *
   * @returns The dot colour.
   */
  protected dotColor(): string {
    if (this.isRunning()) return '#e8a000'
    return this.card.status === 'error' ? '#f04040' : '#4070e0'
  }

  /**
   * The commit message with any co-author trailer stripped.
   *
   * @returns The stripped message.
   */
  protected message(): string {
    return stripCommitCoauthorTrailer(this.card.message)
  }

  /**
   * The "Committing..." label.
   *
   * @returns The translated label.
   */
  protected committingLabel(): string {
    return this.i18n.t('ide.chat.committing', undefined, { defaultValue: 'Committing...' })
  }

  /**
   * The commit label prefix.
   *
   * @returns The translated "Commit".
   */
  protected commitLabel(): string {
    return this.i18n.t('ide.chat.commitLabel', undefined, { defaultValue: 'Commit' })
  }

  /**
   * The file-count line.
   *
   * @returns The translated count.
   */
  protected fileCountLabel(): string {
    return this.i18n.t(
      'ide.chat.fileCount',
      { count: this.card.files.length },
      { defaultValue: '{{count}} files' },
    )
  }

  /**
   * The header button's chrome.
   *
   * @returns The style attribute text.
   */
  protected headerStyle(): string | null {
    return styleText({
      display: 'flex',
      alignItems: 'flex-start',
      gap: 6,
      background: 'none',
      border: 'none',
      cursor: this.hasFiles() ? 'pointer' : 'default',
      color: 'inherit',
      textAlign: 'left',
      padding: '2px 0',
      width: '100%',
      minWidth: 0,
    })
  }

  /**
   * The label's truncation while collapsed.
   *
   * @returns The style attribute text.
   */
  protected labelWrapStyle(): string | null {
    return styleText({
      flex: '1',
      minWidth: 0,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: this.expanded() ? 'normal' : 'nowrap',
    })
  }

  /**
   * The label's inner row.
   *
   * @returns The style attribute text.
   */
  protected labelInnerStyle(): string | null {
    return styleText({ fontSize: 13, display: 'flex', alignItems: 'center', gap: 5 })
  }

  /**
   * The disclosure chevron's placement.
   *
   * @returns The style attribute text.
   */
  protected chevronStyle(): string | null {
    return styleText({
      display: 'block',
      flexShrink: 0,
      marginTop: 3,
      transform: this.expanded() ? 'rotate(90deg)' : 'rotate(0deg)',
      transition: 'transform 150ms, opacity 100ms',
      opacity: this.hovered() ? 0.85 : 0.35,
    })
  }

  /**
   * The revert control's placement and resting state. Touch cannot hover it
   * into view, so a coarse pointer rests it visible at 0.6 with a 32px hit
   * box (the floor for these dense inline rows).
   *
   * @returns The style attribute text.
   */
  /**
   * The revert control's resting opacity (React's rendered style value).
   *
   * React applies this only when the value changes, so an imperative write (the
   * control's own hover) survives while the value stays put; Angular's
   * `[style.opacity]` binding diffs the same way.
   *
   * @returns The opacity React's style prop renders.
   */
  protected revertOpacity(): number {
    return this.isReverting()
      ? 0.3
      : this.hovered() || this.coarse() || this.revertHovered()
        ? 0.6
        : 0
  }

  /**
   * The icon-only revert control's layout (React writes its opacity, cursor and
   * background separately).
   *
   * @returns The width and height in pixels.
   */
  protected revertSizeText(): string {
    return `${this.coarse() ? 32 : 20}px`
  }

  /**
   * The revert control's cursor (a revert in flight waits).
   *
   * @returns The cursor value.
   */
  protected revertCursor(): string {
    return this.isReverting() ? 'wait' : 'pointer'
  }

  /**
   * The revert control's accessible label (its action, not its state).
   *
   * @returns The translated title.
   */
  protected revertTitle(): string {
    return this.isReverted()
      ? this.i18n.t('ide.chat.redoCommit', undefined, { defaultValue: 'Re-apply this commit' })
      : this.i18n.t('ide.chat.revertCommit', undefined, { defaultValue: 'Revert this commit' })
  }

  /** Reveals the revert control while its own hover keeps it visible. */
  onRevertEnter(event: Event): void {
    const el = event.currentTarget
    if (el instanceof HTMLElement) {
      el.style.opacity = '1'
      el.style.background = REVERT_HOVER_BACKGROUND
    }
    this.revertHovered.set(true)
  }

  /** Leaves the revert control's fill at React's post-hover value. */
  onRevertLeave(event: Event): void {
    const el = event.currentTarget
    if (el instanceof HTMLElement) {
      el.style.opacity = ''
      el.style.background = REVERT_RESTING_BACKGROUND
    }
    this.revertHovered.set(false)
  }

  /**
   * Activates the revert control from the keyboard (React's Enter/Space).
   *
   * @param event - The keydown event.
   */
  onRevertKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    void this.handleRevert(event)
  }

  /**
   * Reverts (or re-applies) the commit and remembers the resulting hash, so
   * the undo itself can be undone.
   *
   * @param event - The click or keydown that fired the control.
   */
  async handleRevert(event: Event): Promise<void> {
    event.stopPropagation()
    if (!this.canRevert() || this.isReverting()) return
    const onRevert = this.onRevert
    const hashToRevert = this.isReverted() ? this.revertHash() : this.card.hash
    if (!onRevert || !hashToRevert) return
    this.isReverting.set(true)
    try {
      const newHash = await onRevert(hashToRevert)
      if (newHash) {
        // Undoing and re-applying both store the resulting hash, so the next
        // activation reverts THAT commit — undo/redo, not a one-shot revert.
        this.revertHash.set(newHash)
        this.isReverted.update((value) => !value)
      }
    } finally {
      this.isReverting.set(false)
    }
  }
}
