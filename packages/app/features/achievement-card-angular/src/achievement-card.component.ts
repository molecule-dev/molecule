/**
 * AchievementCard component (React parity).
 *
 * @module
 */

import type { ElementRef } from '@angular/core'
import { Component, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import type { AchievementCardProps } from './types.js'

/**
 * AchievementCard component.
 *
 * Badge / achievement unlock card — icon + name + description + earned state.
 * Locked achievements render greyed-out; in-progress ones show a progress bar.
 * The host IS the Card `div` (`div[mol-achievement-card]`), matching React's
 * root exactly — same classes, same inline style. Node props (`name`,
 * `description`, `icon`, `earnedAt`, `tier`) are projected content
 * (`[slot=<name>]`) or plain string inputs.
 *
 * This is the Angular counterpart of `@molecule/app-achievement-card-react`.
 *
 * @remarks
 * The optional tier / description / earned-at regions stay in the template so
 * their `<ng-content>` capture points always mount, and leave the page while
 * nothing renders in them, as React's `{tier && …}`, `{description && …}` and
 * `{earnedAt && …}` render no such element.
 */
@Component({
  selector: 'div[mol-achievement-card]',
  standalone: true,
  inputs: [
    'name',
    'description',
    'icon',
    'earned',
    'earnedAt',
    'earnedLabel',
    'lockedLabel',
    'progress',
    'tier',
    'className',
  ],
  hostDirectives: [MolPlacement],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyleText()',
  },
  // prettier-ignore
  template: `<div [class]="rowClasses()"><div [class]="iconBoxClasses()" style="font-size: 36px">@if (hasIcon) {{{ icon }}}<ng-content select="[slot=icon]" /></div><div [class]="bodyClasses()"><header [class]="headerClasses()"><h3 [class]="nameClasses()">@if (hasName) {{{ name }}}<ng-content select="[slot=name]" /></h3><span #tierEl [class]="tierClasses()">@if (hasTier) {{{ tier }}}<ng-content select="[slot=tier]" /></span></header><p #descriptionEl [class]="descriptionClasses()">@if (hasDescription) {{{ description }}}<ng-content select="[slot=description]" /></p>@if (earned) {<span #earnedAtEl [class]="earnedAtClasses()">{{ earnedLine() }}@if (hasEarnedAt) {{{ earnedAt }}}<ng-content select="[slot=earnedAt]" /></span>} @else if (progress) {<div [class]="progressClasses()"><div [class]="progressBarClasses()" [style]="progressStyleText()"></div></div>} @else {<span [class]="lockedClasses()">{{ lockedText() }}</span>}</div></div>`,
})
export class AchievementCard {
  /** Achievement name — a string input, or `[slot=name]` projected content. */
  name?: unknown
  /** Description / what it took to earn — a string input, or `[slot=description]` content. */
  description?: unknown
  /** Icon / illustration slot — `[slot=icon]` projected content (or a string input). */
  icon?: unknown
  /** Whether the user has earned this achievement. */
  earned?: boolean
  /** Earned-at display — a string input, or `[slot=earnedAt]` projected content. */
  earnedAt?: unknown
  /** Label shown before `earnedAt` on earned achievements (overrides `t()`). */
  earnedLabel?: string
  /** Label shown on locked achievements (overrides `t()`). */
  lockedLabel?: string
  /** Optional progress data (for in-progress achievements). */
  progress?: AchievementCardProps['progress']
  /** Optional rarity / tier label — a string input, or `[slot=tier]` content. */
  tier?: unknown
  /** Extra classes. */
  className?: string

  /** The tier span (always in the header; detached while it has nothing to render). */
  @ViewChild('tierEl', { static: true }) private tierEl?: ElementRef<HTMLSpanElement>
  /** The description paragraph (always in the body; detached while it has nothing to render). */
  @ViewChild('descriptionEl', { static: true })
  private descriptionEl?: ElementRef<HTMLParagraphElement>
  /** The earned-at span (in the earned row; detached while it has nothing to render). */
  @ViewChild('earnedAtEl') private earnedAtEl?: ElementRef<HTMLSpanElement>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * Keeps each optional region on the page only while it renders a text input
   * or projected content, re-decided whenever either changes (a slot taken
   * away and given back included).
   */
  constructor() {
    usePlacement((hasContent) => {
      const tier = this.tierEl?.nativeElement
      setElementPresent(tier, this.hasTier || (tier ? hasContent(tier) : false))
      const description = this.descriptionEl?.nativeElement
      setElementPresent(
        description,
        this.hasDescription || (description ? hasContent(description) : false),
      )
      const earnedAt = this.earnedAtEl?.nativeElement
      // The span interpolates its own label first, so only the children after
      // it can be the caller's projection.
      setElementPresent(earnedAt, this.hasEarnedAt || (earnedAt ? hasContent(earnedAt, 1) : false))
    })
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Whether a text name input renders (a projected name is not).
   * @returns True when the name input renders as text.
   */
  get hasName(): boolean {
    return this.name !== undefined && this.name !== null
  }

  /**
   * Whether a text icon input renders (a projected icon is not).
   * @returns True when the icon input renders as text.
   */
  get hasIcon(): boolean {
    return this.icon !== undefined && this.icon !== null && this.icon !== ''
  }

  /**
   * Whether a text tier input is present (React's `tier && …`).
   * @returns True when the tier renders as text.
   */
  get hasTier(): boolean {
    return this.tier !== undefined && this.tier !== null && this.tier !== false && this.tier !== ''
  }

  /**
   * Whether a text description input is present (React's `description && …`).
   * @returns True when the description renders as text.
   */
  get hasDescription(): boolean {
    return (
      this.description !== undefined &&
      this.description !== null &&
      this.description !== false &&
      this.description !== ''
    )
  }

  /**
   * Whether a text earned-at input is present (React's `earnedAt && …`).
   * @returns True when the earned-at renders as text.
   */
  get hasEarnedAt(): boolean {
    return (
      this.earnedAt !== undefined &&
      this.earnedAt !== null &&
      this.earnedAt !== false &&
      this.earnedAt !== ''
    )
  }

  /**
   * The earned state's label (prop > `t()` > default).
   * @returns The "Earned" label.
   */
  earnedText(): string {
    return (
      this.earnedLabel ??
      this.i18n.t('achievementCard.earned', undefined, { defaultValue: 'Earned' })
    )
  }

  /**
   * The locked state's label (prop > `t()` > default).
   * @returns The "Locked" label.
   */
  lockedText(): string {
    return (
      this.lockedLabel ??
      this.i18n.t('achievementCard.locked', undefined, { defaultValue: 'Locked' })
    )
  }

  /**
   * The earned-at line's leading text, with React's separating space.
   * @returns The label and the space before the date.
   */
  earnedLine(): string {
    return `${this.earnedText()} `
  }

  /**
   * The progress bar's inline style (React's `{ width: '<pct>%' }`).
   * @returns The style attribute text, or null without progress.
   */
  progressStyleText(): string | null {
    const progress = this.progress
    if (!progress) return null
    const percent = Math.min(100, (progress.value / progress.max) * 100)
    return styleText({ width: `${percent}%` })
  }

  /**
   * The host's inline style: React's `!earned ? { opacity: 0.5, filter: 'grayscale(0.6)' } : undefined`.
   * @returns The style attribute text, or null when earned.
   */
  hostStyleText(): string | null {
    return this.earned ? null : styleText({ filter: 'grayscale(0.6)', opacity: 0.5 })
  }

  /**
   * The host's class list (React's Card classes plus `className`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.card({ variant: 'elevated' }), cm.cardPadding('md'), this.className)
  }

  /**
   * The icon row's class list (React's `cm.flex({ align: 'start', gap: 'md' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    const cm = this.cm()
    return cm.flex({ align: 'start', gap: 'md' })
  }

  /**
   * The icon box's class list (React's `cm.shrink0`).
   * @returns The class string.
   */
  iconBoxClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.shrink0)
  }

  /**
   * The body column's class list (React's `cm.cn(cm.flex1, cm.stack(1))`).
   * @returns The class string.
   */
  bodyClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex1, cm.stack(1))
  }

  /**
   * The header row's class list (React's `cm.flex({ align: 'baseline', gap: 'sm' })`).
   * @returns The class string.
   */
  headerClasses(): string {
    const cm = this.cm()
    return cm.flex({ align: 'baseline', gap: 'sm' })
  }

  /**
   * The name heading's class list (React's `cm.cn(cm.textSize('base'), cm.fontWeight('bold'))`).
   * @returns The class string.
   */
  nameClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('base'), cm.fontWeight('bold'))
  }

  /**
   * The tier span's class list (React's `cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  tierClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))
  }

  /**
   * The description paragraph's class list (React's `cm.textSize('sm')`).
   * @returns The class string.
   */
  descriptionClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The earned-at span's class list (React's `cm.textSize('xs')`).
   * @returns The class string.
   */
  earnedAtClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The progress track's class list (React's `cm.cn(cm.progress(), cm.progressHeight('sm'))`).
   * @returns The class string.
   */
  progressClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.progress(), cm.progressHeight('sm'))
  }

  /**
   * The progress bar's class list (React's `cm.cn(cm.progressBar(), cm.progressColor('primary'))`).
   * @returns The class string.
   */
  progressBarClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.progressBar(), cm.progressColor('primary'))
  }

  /**
   * The locked label's class list (React's `cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  lockedClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))
  }
}
