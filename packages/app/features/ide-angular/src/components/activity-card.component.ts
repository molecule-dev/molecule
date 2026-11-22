/**
 * Inline activity card — compact, Claude Code-style, rendered in the chat
 * timeline when an `activity` SSE event fires (a captured outbound side effect
 * in dev: email/sms/push/webhook/channel).
 *
 * Angular counterpart of `@molecule/app-ide-react`'s `ActivityCard` (see that
 * file for the design notes): the same inputs (React prop names), the same DOM
 * for the same input, the same callbacks. Shows a per-type icon, a one-line
 * `summary → recipient`, and a status pill. Clicking the card opens the
 * Activity panel filtered to that event's type; a hover deepens the card's
 * border while the pointer is over it, and a coarse pointer gives the whole
 * card a 44px touch target.
 *
 * The host element IS React's root `<button>` (`button[mol-activity-card]`),
 * so the card's own attributes, classes and inline style sit on it through
 * host bindings, and every derived value is a method the template reads, so
 * each change-detection pass renders the current state the way React's render
 * does. The inline styles are per-property `[style.x]` bindings, so each value
 * is applied through the DOM's own CSS parser exactly the way React applies
 * its style object. Styling uses `getClassMap()` (`cm.*`); the only inline
 * styles are layout the ClassMap can't express. All user-facing text goes
 * through `t()`.
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { Activity } from '@molecule/app-ide-panel-logic'
import {
  activityIconName,
  activityStatusColors,
  activityStatusLabel,
  activitySummaryLine,
  CHAT_CARD_ICON_SIZE,
  chatCardBorder,
  chatCardStyle,
} from '@molecule/app-ide-panel-logic'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { useCoarsePointer } from '../hooks/useViewport.js'
import { Icon } from './icon.component.js'

/** Props for `ActivityCard` — the React prop names, React's own contract. */
export interface ActivityCardProps {
  /** The captured activity to render. */
  activity: Activity
  /** Called when the card is clicked — should open the Activity panel filtered to this activity. */
  onActivityClick?: (activity: Activity) => void
}

/**
 * Compact, clickable inline card for a single captured activity.
 */
@Component({
  selector: 'button[mol-activity-card]',
  standalone: true,
  imports: [Icon],
  inputs: ['activity', 'onActivityClick'],
  // The inline styles are bound per property (`[style.x]`), so each value is
  // applied through the DOM's own CSS parser exactly the way React applies
  // its style object — `1` in the flex shorthand, a hex colour and an rgba()
  // come out normalized the same way on both sides.
  host: {
    type: 'button',
    '[attr.data-mol-id]': 'dataId()',
    '[attr.data-activity-type]': 'activity.type',
    '[attr.data-activity-status]': 'activity.status',
    '[attr.aria-label]': 'label()',
    '[class]': 'rootClass()',
    '[style.display]': '"flex"',
    '[style.align-items]': '"center"',
    '[style.gap]': '"8px"',
    '[style.margin-bottom]': '"16px"',
    '[style.padding]': 'chrome().padding',
    '[style.border-radius]': '"8px"',
    '[style.border]': 'chrome().border',
    '[style.background]': 'chrome().background',
    '[style.min-height]': 'touchTarget()',
    '[style.text-align]': '"left"',
    '[style.cursor]': 'cursor()',
    '[style.color]': '"inherit"',
    '[style.transition]': '"border-color 100ms"',
    '(click)': 'onCardClick()',
    '(mouseenter)': 'onMouseEnter($event)',
    '(mouseleave)': 'onMouseLeave($event)',
  },
  // prettier-ignore
  template: `<svg mol-icon [name]="iconName()" [size]="iconSize" aria-hidden="true" [style.flex-shrink]="'0'"></svg>
    <span [class]="cm.textSize('xs')" [style.flex]="'1'" [style.min-width]="'0px'" [style.overflow]="'hidden'" [style.text-overflow]="'ellipsis'" [style.white-space]="'nowrap'">{{ summaryLine() }}</span>
    <span [attr.data-mol-id]="statusId()" [style.flex-shrink]="'0'" [style.font-size]="'10px'" [style.font-weight]="'600'" [style.text-transform]="'uppercase'" [style.letter-spacing]="'0.04em'" [style.padding]="'2px 7px'" [style.border-radius]="'999px'" [style.color]="pill().fg" [style.background]="pill().bg">{{ statusLabel() }}</span>`,
})
export class ActivityCard {
  /** The captured activity to render. */
  activity!: Activity

  /**
   * Called when the card is clicked — should open the Activity panel filtered
   * to this activity. `undefined` by a host that renders the card read-only:
   * then no click or hover handler acts, the cursor says `default`, and a
   * coarse pointer gets no touch target.
   */
  onActivityClick?: (activity: Activity) => void

  /** The bonded ClassMap (styling tokens resolve at render time). */
  protected readonly cm: UIClassMap = getClassMap()

  /** Reactive translation, read in the injection context. */
  protected readonly i18n = useTranslation()

  /** The translation function for the host's label binding. */
  protected readonly t = this.i18n.t

  /** The active locale code (a change re-runs the bindings that read it). */
  protected readonly locale = this.i18n.locale

  /** Whether the primary pointer is coarse (the 44px touch target). */
  protected readonly isCoarse = useCoarsePointer()

  /** The leading icon's pixel size (the chat cards' shared icon size). */
  protected readonly iconSize: number = CHAT_CARD_ICON_SIZE

  /** Whether the card is clickable (React's `Boolean(onActivityClick)`). */
  protected clickable(): boolean {
    return Boolean(this.onActivityClick)
  }

  /**
   * The card's `data-mol-id`.
   * @returns The attribute value.
   */
  protected dataId(): string {
    return `activity-card-${this.activity.id}`
  }

  /**
   * The status pill's `data-mol-id`.
   * @returns The attribute value.
   */
  protected statusId(): string {
    return `activity-status-${this.activity.id}`
  }

  /**
   * The card's accessible name.
   * @returns The translated label.
   */
  protected label(): string {
    return this.t('ide.activity.cardAria', undefined, { defaultValue: 'View captured activity' })
  }

  /**
   * The card's classes: the `xs` text scale and the full width, composed
   * exactly as React composes them.
   * @returns The resolved class string.
   */
  protected rootClass(): string {
    return this.cm.cn(this.cm.textSize('xs'), this.cm.w('full'))
  }

  /**
   * The chat cards' shared container chrome: subtle tint, full 1px border on
   * all sides, one padding (React spreads `chatCardStyle()` into its style
   * object; the per-property bindings carry each value).
   * @returns The chrome's style values.
   */
  protected chrome(): { padding: string; border: string; background: string } {
    return chatCardStyle()
  }

  /**
   * The coarse-pointer touch target: the whole card is the tap target, so a
   * clickable card on a touch screen stands at the 44px standalone-control
   * floor (`null` removes the property the way React's conditional spread
   * omits it).
   * @returns The min-height value, or null.
   */
  protected touchTarget(): string | null {
    return this.isCoarse() && this.clickable() ? '44px' : null
  }

  /**
   * The card's cursor: a pointer when it is clickable, the default otherwise.
   * @returns The cursor value.
   */
  protected cursor(): string {
    return this.clickable() ? 'pointer' : 'default'
  }

  /**
   * The leading icon's glyph name: per channel type, from the shared map.
   * @returns The icon-set glyph name.
   */
  protected iconName(): ReturnType<typeof activityIconName> {
    return activityIconName(this.activity.type)
  }

  /**
   * The one-line summary: `summary → recipient`, with the shared fallbacks.
   * @returns The summary text.
   */
  protected summaryLine(): string {
    // The shared helper translates through panel-logic's static `t`, so this
    // reads the locale signal to track a locale switch the way React's
    // whole-component re-render does (zoneless change detection re-runs only
    // the bindings that read a changed signal).
    void this.locale()
    return activitySummaryLine(this.activity)
  }

  /**
   * The status pill's colors for the activity's status (the per-property
   * bindings carry them onto the pill).
   * @returns The `fg`/`bg` color pair.
   */
  protected pill(): { fg: string; bg: string } {
    return activityStatusColors(this.activity.status)
  }

  /**
   * The status pill's translated label.
   * @returns The label text.
   */
  protected statusLabel(): string {
    // Follows a locale switch — see {@link summaryLine}.
    void this.locale()
    return activityStatusLabel(this.activity.status)
  }

  /**
   * Hands the activity to the host's callback — React's `onClick`, which only
   * exists on a clickable card, so an inert card does nothing.
   */
  protected onCardClick(): void {
    this.onActivityClick?.(this.activity)
  }

  /**
   * Deepens the card's border while the pointer is over it — React's
   * `onMouseEnter`, which only exists on a clickable card.
   * @param event - The native mouse event.
   */
  protected onMouseEnter(event: MouseEvent): void {
    if (!this.clickable()) return
    ;(event.currentTarget as HTMLElement).style.borderColor = chatCardBorder(undefined, 70)
  }

  /**
   * Restores the resting border when the pointer leaves — React's
   * `onMouseLeave`.
   * @param event - The native mouse event.
   */
  protected onMouseLeave(event: MouseEvent): void {
    if (!this.clickable()) return
    ;(event.currentTarget as HTMLElement).style.borderColor = chatCardBorder()
  }
}
