/**
 * AchievementCard component (React parity).
 *
 * @module
 */

import type { AfterViewInit, ElementRef } from '@angular/core'
import { Component, signal, ViewChild } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { styleText } from '@molecule/app-ui-angular'

import type { AchievementCardProps } from './types.js'

/**
 * Whether a node is something a caller can see (an element, or a non-blank
 * text node).
 *
 * @param node - The DOM node.
 * @returns True when it renders anything.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

/**
 * Whether an element carries renderable content (a projected slot landed, or
 * its text input rendered).
 *
 * @param el - The element.
 * @returns True when its children render anything.
 */
const hasRenderableContent = (el: HTMLElement): boolean =>
  Array.from(el.childNodes).some(hasRenderable)

/**
 * Whether an element carries renderable content after its first child — for a
 * region whose own label the component interpolates as the first text node, so
 * only what the caller projected counts.
 *
 * @param el - The element.
 * @returns True when a projected child renders anything.
 */
const hasRenderableProjection = (el: HTMLElement): boolean =>
  Array.from(el.childNodes).slice(1).some(hasRenderable)

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
 * Angular projection needs the `<ng-content>` capture points mounted, so the
 * optional tier / description / earned-at regions render optimistically and
 * {@link AchievementCard.ngAfterViewInit} withdraws the ones nothing was
 * projected into (React would not render them at all).
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
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyleText()',
  },
  // prettier-ignore
  template: `<div [class]="rowClasses()"><div [class]="iconBoxClasses()" style="font-size: 36px">@if (hasIcon) {{{ icon }}}<ng-content select="[slot=icon]" /></div><div [class]="bodyClasses()"><header [class]="headerClasses()"><h3 [class]="nameClasses()">@if (hasName) {{{ name }}}<ng-content select="[slot=name]" /></h3>@if (showTier) {<span #tierEl [class]="tierClasses()">@if (hasTier) {{{ tier }}}<ng-content select="[slot=tier]" /></span>}</header>@if (showDescription) {<p #descriptionEl [class]="descriptionClasses()">@if (hasDescription) {{{ description }}}<ng-content select="[slot=description]" /></p>}@if (earned) {@if (showEarnedAt) {<span #earnedAtEl [class]="earnedAtClasses()">{{ earnedLine() }}@if (hasEarnedAt) {{{ earnedAt }}}<ng-content select="[slot=earnedAt]" /></span>}} @else if (progress) {<div [class]="progressClasses()"><div [class]="progressBarClasses()" [style]="progressStyleText()"></div></div>} @else {<span [class]="lockedClasses()">{{ lockedText() }}</span>}</div></div>`,
})
export class AchievementCard implements AfterViewInit {
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

  /** The optional tier span (projected content lands here; read once). */
  @ViewChild('tierEl') private tierEl?: ElementRef<HTMLSpanElement>
  /** The optional description paragraph (projected content lands here; read once). */
  @ViewChild('descriptionEl') private descriptionEl?: ElementRef<HTMLParagraphElement>
  /** The optional earned-at span (projected content lands here; read once). */
  @ViewChild('earnedAtEl') private earnedAtEl?: ElementRef<HTMLSpanElement>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * Whether a `[slot=tier]` projection landed: true (optimistically) until the
   * first view proves otherwise.
   */
  private readonly tierProjected = signal(true)
  /**
   * Whether a `[slot=description]` projection landed (true until the first
   * view proves otherwise).
   */
  private readonly descriptionProjected = signal(true)
  /**
   * Whether a `[slot=earnedAt]` projection landed (true until the first view
   * proves otherwise; an earned-at span that is not mounted yet keeps the
   * optimistic answer, so flipping `earned` on later reveals it).
   */
  private readonly earnedAtProjected = signal(true)

  /**
   * Reads the optional regions' first render: when neither a text input nor
   * projected content landed, React would not render the region at all, so
   * the optimistic render is withdrawn.
   */
  ngAfterViewInit(): void {
    const tier = this.tierEl?.nativeElement
    if (tier) this.tierProjected.set(hasRenderableContent(tier))
    const description = this.descriptionEl?.nativeElement
    if (description) this.descriptionProjected.set(hasRenderableContent(description))
    const earnedAt = this.earnedAtEl?.nativeElement
    // The region interpolates its own label first, so only the children after
    // it can be the caller's projection.
    if (earnedAt) this.earnedAtProjected.set(hasRenderableProjection(earnedAt))
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
   * Whether the tier span renders: a truthy string input or a projected
   * `[slot=tier]` element.
   * @returns True when the tier shows.
   */
  get showTier(): boolean {
    return this.hasTier || this.tierProjected()
  }

  /**
   * Whether the description paragraph renders.
   * @returns True when the description shows.
   */
  get showDescription(): boolean {
    return this.hasDescription || this.descriptionProjected()
  }

  /**
   * Whether the earned-at span renders.
   * @returns True when the earned-at line shows.
   */
  get showEarnedAt(): boolean {
    return this.hasEarnedAt || this.earnedAtProjected()
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
