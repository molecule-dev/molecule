/**
 * VoteCluster component (React parity).
 *
 * @module
 */

import { Component, type OnInit, signal } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { VoteClusterDirection, VoteValue } from './types.js'

/**
 * Computes the next vote value for a click on the up or down arrow.
 *
 * Toggle rules:
 * - Up clicked while currently up → `0` (clear).
 * - Up clicked otherwise → `1`.
 * - Down clicked while currently down → `0` (clear).
 * - Down clicked otherwise → `-1`.
 *
 * @param current - The viewer's current vote.
 * @param direction - Which arrow was clicked (`1` = up, `-1` = down).
 * @returns The next vote value to emit.
 */
function nextVote(current: VoteValue, direction: 1 | -1): VoteValue {
  if (current === direction) return 0
  return direction
}

/**
 * Reddit/HN-style stacked up-arrow + score + down-arrow cluster.
 *
 * Renders two arrow buttons with a score readout between them. Click
 * semantics follow link-aggregator convention (toggling the same arrow
 * clears the vote; clicking the opposite arrow swaps it). The score is
 * **not** mutated by the cluster — parents own that calculation and pass
 * the new score back via `score` after handling `onVote`.
 *
 * The host IS the outer `<div>` (`div[mol-vote-cluster]`), matching React's
 * root exactly. Styling is delegated entirely to `getClassMap()`; the active
 * arrow is painted via a CSS custom property (`--mol-color-*`).
 */
@Component({
  selector: 'div[mol-vote-cluster]',
  standalone: true,
  inputs: [
    'score',
    'myVote',
    'defaultVote',
    'onVote',
    'disabled',
    'direction',
    'ariaLabel',
    'dataMolId',
    'className',
  ],
  host: {
    '[class]': 'wrapperClasses()',
    role: 'group',
    '[attr.aria-label]': 'groupLabel()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // The template's whitespace is semantic: Angular keeps whitespace-only text
  // nodes, so the DOM React renders is reproduced by gluing the tags.
  // prettier-ignore
  template: `<button type="button" (click)="emit(1)" [disabled]="disabled === true" [attr.aria-label]="upLabel()" [attr.aria-pressed]="upPressed() ? 'true' : 'false'" data-vote="up" data-mol-id="vote-cluster-up" [class]="arrowClasses()" [style.background]="'none'" [style.border]="'none'" [style.padding]="'0px'" [style.cursor]="disabled ? 'not-allowed' : 'pointer'" [style.opacity]="disabled ? 0.5 : 1" [style.display]="'inline-flex'" [style.align-items]="'center'" [style.justify-content]="'center'" [style.transition]="'color 150ms ease, transform 150ms ease'" [style.line-height]="'0'" [style.color]="upColor()" [style.transform]="upTransform()"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 5l7 9H5l7-9z" fill="currentColor"></path></svg></button><span [class]="scoreClasses()" [attr.aria-label]="scoreLabel()" aria-live="polite" data-vote="score" [style.transition]="'color 150ms ease'" [style.color]="scoreColor()" [style.font-variant-numeric]="'tabular-nums'" [style.min-width]="'2ch'" [style.text-align]="'center'">{{ score }}</span><button type="button" (click)="emit(-1)" [disabled]="disabled === true" [attr.aria-label]="downLabel()" [attr.aria-pressed]="downPressed() ? 'true' : 'false'" data-vote="down" data-mol-id="vote-cluster-down" [class]="arrowClasses()" [style.background]="'none'" [style.border]="'none'" [style.padding]="'0px'" [style.cursor]="disabled ? 'not-allowed' : 'pointer'" [style.opacity]="disabled ? 0.5 : 1" [style.display]="'inline-flex'" [style.align-items]="'center'" [style.justify-content]="'center'" [style.transition]="'color 150ms ease, transform 150ms ease'" [style.line-height]="'0'" [style.color]="downColor()" [style.transform]="downTransform()"><svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 19l-7-9h14l-7 9z" fill="currentColor"></path></svg></button>`,
})
export class VoteCluster implements OnInit {
  /** Current score (number to display between the arrows). */
  score!: number
  /** The viewer's current vote (controlled mode; omit for uncontrolled). */
  myVote?: VoteValue
  /** Initial vote value used in uncontrolled mode. */
  defaultVote?: VoteValue
  /** Called whenever the viewer's vote toggles. */
  onVote?: (next: VoteValue) => void
  /** Disables both arrow buttons. */
  disabled?: boolean
  /** Layout direction (defaults to `'vertical'` at read time). */
  direction?: VoteClusterDirection
  /** Optional accessible label for the whole cluster. */
  ariaLabel?: string
  /** Optional `data-mol-id` for AI-agent automation. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string

  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the labels on a locale switch.
   */
  private readonly i18n = useTranslation()

  /** The uncontrolled vote (React's `useState`), seeded from `defaultVote`. */
  private readonly internal = signal<VoteValue>(0)

  /**
   * Seeds the internal vote from the `defaultVote` input once, after Angular
   * has bound the inputs (React's `useState` initial value; a later prop write
   * must not move the selection).
   */
  ngOnInit(): void {
    this.internal.set(this.defaultVote ?? 0)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The active vote: the controlled `myVote` when supplied, otherwise the
   * internal vote (React's `active`).
   * @returns The viewer's current vote.
   */
  active(): VoteValue {
    return this.myVote !== undefined ? this.myVote : this.internal()
  }

  /**
   * Whether the up arrow is the active vote (React's `upPressed`).
   * @returns True when upvoted.
   */
  upPressed(): boolean {
    return this.active() === 1
  }

  /**
   * Whether the down arrow is the active vote (React's `downPressed`).
   * @returns True when downvoted.
   */
  downPressed(): boolean {
    return this.active() === -1
  }

  /**
   * Emits the toggled vote (React's `emit`), updating the internal vote in
   * uncontrolled mode only.
   * @param dir - Which arrow was clicked (`1` = up, `-1` = down).
   */
  emit(dir: 1 | -1): void {
    if (this.disabled) return
    const next = nextVote(this.active(), dir)
    if (this.myVote === undefined) this.internal.set(next)
    this.onVote?.(next)
  }

  /**
   * The wrapper's class list (React's `cm.cn(cm.flex(...), className)`).
   * @returns The class string.
   */
  wrapperClasses(): string {
    const flex =
      this.direction === 'horizontal'
        ? this.cm().flex({ align: 'center', justify: 'center', gap: 'xs' })
        : this.cm().flex({ direction: 'col', align: 'center', justify: 'center', gap: 'xs' })
    return this.cm().cn(flex, this.className)
  }

  /**
   * An arrow button's class (`cm.touchTarget`).
   * @returns The class string.
   */
  arrowClasses(): string {
    return this.cm().touchTarget
  }

  /**
   * The score span's class list.
   * @returns The class string.
   */
  scoreClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The whole cluster's accessible label (React's `groupLabel`).
   * @returns The label text.
   */
  groupLabel(): string {
    return (
      this.ariaLabel ??
      this.i18n.t(
        'vote-cluster.group',
        { score: this.score },
        { defaultValue: 'Vote cluster, current score {{score}}' },
      )
    )
  }

  /**
   * The up button's accessible label (React's `upLabel`).
   * @returns The label text.
   */
  upLabel(): string {
    return this.upPressed()
      ? this.i18n.t('vote-cluster.removeUpvote', {}, { defaultValue: 'Remove upvote' })
      : this.i18n.t('vote-cluster.upvote', {}, { defaultValue: 'Upvote' })
  }

  /**
   * The down button's accessible label (React's `downLabel`).
   * @returns The label text.
   */
  downLabel(): string {
    return this.downPressed()
      ? this.i18n.t('vote-cluster.removeDownvote', {}, { defaultValue: 'Remove downvote' })
      : this.i18n.t('vote-cluster.downvote', {}, { defaultValue: 'Downvote' })
  }

  /**
   * The score readout's accessible label (React's `scoreLabel`).
   * @returns The label text.
   */
  scoreLabel(): string {
    return this.i18n.t(
      'vote-cluster.score',
      { score: this.score },
      { defaultValue: 'Score: {{score}}' },
    )
  }

  /**
   * The up arrow's CSS colour (React's `upStyle.color`).
   * @returns The CSS colour.
   */
  upColor(): string {
    return this.upPressed() ? 'var(--mol-color-primary)' : 'var(--mol-color-on-surface-variant)'
  }

  /**
   * The down arrow's CSS colour (React's `downStyle.color`).
   * @returns The CSS colour.
   */
  downColor(): string {
    return this.downPressed() ? 'var(--mol-color-info)' : 'var(--mol-color-on-surface-variant)'
  }

  /**
   * The up arrow's scale transform (React's `upStyle.transform`).
   * @returns The CSS transform.
   */
  upTransform(): string {
    return this.upPressed() ? 'scale(1.1)' : 'scale(1)'
  }

  /**
   * The down arrow's scale transform (React's `downStyle.transform`).
   * @returns The CSS transform.
   */
  downTransform(): string {
    return this.downPressed() ? 'scale(1.1)' : 'scale(1)'
  }

  /**
   * The score readout's CSS colour (React's `scoreStyle.color`).
   * @returns The CSS colour.
   */
  scoreColor(): string {
    if (this.upPressed()) return 'var(--mol-color-primary)'
    if (this.downPressed()) return 'var(--mol-color-info)'
    return 'inherit'
  }
}
