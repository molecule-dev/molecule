/**
 * HabitStreakCard component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { StreakDay } from './types.js'

/**
 * Returns a green rgba color whose opacity scales with completion intensity.
 *
 * @param count - The day's completion count.
 * @param max - The largest count in the rendered heatmap window.
 * @returns The CSS background color.
 */
function intensityColor(count: number, max: number): string {
  if (count === 0) return 'rgba(0,0,0,0.08)'
  const t = Math.min(1, count / Math.max(1, max))
  // simple green ramp
  return `rgba(34,197,94,${0.25 + 0.75 * t})`
}

/**
 * HabitStreakCard component.
 *
 * Habit / streak summary card with current + best streak, total completions,
 * and an optional heatmap strip. The host IS React's root `<div>`
 * (`div[mol-habit-streak-card]`), carrying the `Card` classes exactly as
 * React's `Card` does. `name` and `icon` are projected content
 * (`[slot=name]`, `[slot=icon]`) or plain string inputs; the stat labels go
 * through `useTranslation()` with React's exact keys and English defaults.
 * `heatmapDays` truncates `heatmap` from the end (most recent days win).
 */
@Component({
  selector: 'div[mol-habit-streak-card]',
  standalone: true,
  inputs: [
    'name',
    'icon',
    'currentStreak',
    'bestStreak',
    'totalCompletions',
    'heatmap',
    'heatmapDays',
    'className',
  ],
  host: {
    '[class]': 'cardClasses()',
  },
  // prettier-ignore
  template: `<div [class]="stackClasses()"><header [class]="headerClasses()"><ng-content select="[slot=icon]"></ng-content>@if (hasIcon) {<ng-container>{{ icon }}</ng-container>}<h3 [class]="nameClasses()">@if (hasName) {<ng-container>{{ name }}</ng-container>}<ng-content select="[slot=name]"></ng-content></h3></header><div [class]="statsClasses()"><div><div [class]="currentValueClasses()">{{ currentStreak }}</div><div [class]="labelClasses()">{{ currentLabel() }}</div></div>@if (bestStreak !== undefined) {<div><div [class]="secondaryValueClasses()">{{ bestStreak }}</div><div [class]="labelClasses()">{{ bestLabel() }}</div></div>}@if (totalCompletions !== undefined) {<div><div [class]="secondaryValueClasses()">{{ totalCompletions }}</div><div [class]="labelClasses()">{{ totalLabel() }}</div></div>}</div>@if (days().length > 0) {<div [class]="stripClasses()" aria-label="Recent activity">@for (day of days(); track day.date) {<span [attr.aria-label]="dayLabel(day)" [attr.title]="dayLabel(day)" [style.width]="'10px'" [style.height]="'10px'" [style.border-radius]="'2px'" [style.background]="dayBackground(day)"></span>}</div>}</div>`,
})
export class HabitStreakCard {
  /** Habit name — a string input, or `[slot=name]` projected content. */
  name?: unknown
  /** Optional leading icon — a string input, or `[slot=icon]` projected content. */
  icon?: unknown
  /** Current streak (days). */
  currentStreak?: number
  /** Best streak (days). */
  bestStreak?: number
  /** Total completions. */
  totalCompletions?: number
  /** Optional heatmap days — rendered as a strip of squares. */
  heatmap?: StreakDay[]
  /** Days the heatmap should display (defaults to 30 at read time). */
  heatmapDays?: number
  /** Extra classes on the card. */
  className?: string

  /** The i18n provider above the card (the stat labels). */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the card class list — React's `Card` with the default `elevated`
   * variant and `md` padding, plus `className`.
   * @returns The class string.
   */
  cardClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.card({ variant: 'elevated' }), cm.cardPadding('md'), this.className)
  }

  /**
   * The outer stack class list.
   * @returns The class string.
   */
  stackClasses(): string {
    return this.cm().stack(3)
  }

  /**
   * The name row class list.
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The habit-name heading class list.
   * @returns The class string.
   */
  nameClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))
  }

  /**
   * The stats row class list.
   * @returns The class string.
   */
  statsClasses(): string {
    return this.cm().flex({ align: 'baseline', gap: 'lg' })
  }

  /**
   * The current-streak number class list.
   * @returns The class string.
   */
  currentValueClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'))
  }

  /**
   * The best-streak / total-completions number class list.
   * @returns The class string.
   */
  secondaryValueClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))
  }

  /**
   * The stat label class list.
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().textSize('xs')
  }

  /**
   * The heatmap strip class list.
   * @returns The class string.
   */
  stripClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs' })
  }

  /**
   * The heatmap days in the rendered window (React's `slice(-heatmapDays)`).
   * @returns The days to render.
   */
  days(): StreakDay[] {
    return (this.heatmap ?? []).slice(-(this.heatmapDays ?? 30))
  }

  /**
   * The largest count in the rendered window.
   * @returns The maximum completion count.
   */
  maxCount(): number {
    return this.days().reduce((max, day) => Math.max(max, day.count), 0)
  }

  /**
   * One heatmap square's label (`<date>: <count>`).
   * @param day - The day.
   * @returns Its label.
   */
  dayLabel(day: StreakDay): string {
    return `${day.date}: ${day.count}`
  }

  /**
   * One heatmap square's background color.
   * @param day - The day.
   * @returns The CSS background color.
   */
  dayBackground(day: StreakDay): string {
    return intensityColor(day.count, this.maxCount())
  }

  /**
   * Whether `name` arrives as a text input (projected content otherwise).
   * @returns True when `name` is a non-empty string.
   */
  get hasName(): boolean {
    return typeof this.name === 'string' && this.name.length > 0
  }

  /**
   * Whether `icon` arrives as a text input (projected content otherwise).
   * @returns True when `icon` is a non-empty string.
   */
  get hasIcon(): boolean {
    return typeof this.icon === 'string' && this.icon.length > 0
  }

  /**
   * The current-streak label.
   * @returns The translated text.
   */
  currentLabel(): string {
    return this.i18n.t('habit.currentStreak', {}, { defaultValue: 'day streak' })
  }

  /**
   * The best-streak label.
   * @returns The translated text.
   */
  bestLabel(): string {
    return this.i18n.t('habit.bestStreak', {}, { defaultValue: 'best' })
  }

  /**
   * The total-completions label.
   * @returns The translated text.
   */
  totalLabel(): string {
    return this.i18n.t('habit.total', {}, { defaultValue: 'total' })
  }
}
