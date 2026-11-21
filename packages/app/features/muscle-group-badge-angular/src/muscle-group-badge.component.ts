/**
 * MuscleGroupBadge component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { TranslateFunction } from '@molecule/app-i18n'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { MuscleGroup } from './types.js'

/**
 * Hex accent color per group — the group's own category palette (data), not a
 * theme tone; overridable via `accentColor`.
 */
const ACCENT: Record<MuscleGroup, string> = {
  chest: '#ef4444',
  back: '#3b82f6',
  shoulders: '#8b5cf6',
  biceps: '#ec4899',
  triceps: '#f97316',
  forearms: '#f59e0b',
  core: '#10b981',
  glutes: '#a855f7',
  quads: '#14b8a6',
  hamstrings: '#06b6d4',
  calves: '#84cc16',
  fullBody: '#6366f1',
}

/** Glyph pixel size per display size. */
const SIZE_PX = { sm: 32, md: 48, lg: 72 } as const

/**
 * Default English label for a muscle group — the same string each group's
 * literal `t()` default surfaces. Exposed for tests and downstream consumers
 * that need to label buttons / menus / search filters by group.
 *
 * @param group - The muscle group.
 * @returns A short, capitalized English label.
 */
export function defaultLabelFor(group: MuscleGroup): string {
  switch (group) {
    case 'chest':
      return 'Chest'
    case 'back':
      return 'Back'
    case 'shoulders':
      return 'Shoulders'
    case 'biceps':
      return 'Biceps'
    case 'triceps':
      return 'Triceps'
    case 'forearms':
      return 'Forearms'
    case 'core':
      return 'Core'
    case 'glutes':
      return 'Glutes'
    case 'quads':
      return 'Quads'
    case 'hamstrings':
      return 'Hamstrings'
    case 'calves':
      return 'Calves'
    case 'fullBody':
      return 'Full body'
  }
}

/**
 * Translated label for a muscle group — one literal `t()` call per group, so
 * the i18n gate can verify every key this lookup can produce against the
 * `@molecule/app-locales-muscle-group-badge` bond; a key built at runtime from
 * the group value would be invisible to it.
 *
 * @param t - The translation function from `useTranslation()`.
 * @param group - The muscle group to label.
 * @returns The label in the active locale, or the group's English default.
 */
function translatedLabel(t: TranslateFunction, group: MuscleGroup): string {
  switch (group) {
    case 'chest':
      return t('muscleGroupBadge.group.chest', {}, { defaultValue: 'Chest' })
    case 'back':
      return t('muscleGroupBadge.group.back', {}, { defaultValue: 'Back' })
    case 'shoulders':
      return t('muscleGroupBadge.group.shoulders', {}, { defaultValue: 'Shoulders' })
    case 'biceps':
      return t('muscleGroupBadge.group.biceps', {}, { defaultValue: 'Biceps' })
    case 'triceps':
      return t('muscleGroupBadge.group.triceps', {}, { defaultValue: 'Triceps' })
    case 'forearms':
      return t('muscleGroupBadge.group.forearms', {}, { defaultValue: 'Forearms' })
    case 'core':
      return t('muscleGroupBadge.group.core', {}, { defaultValue: 'Core' })
    case 'glutes':
      return t('muscleGroupBadge.group.glutes', {}, { defaultValue: 'Glutes' })
    case 'quads':
      return t('muscleGroupBadge.group.quads', {}, { defaultValue: 'Quads' })
    case 'hamstrings':
      return t('muscleGroupBadge.group.hamstrings', {}, { defaultValue: 'Hamstrings' })
    case 'calves':
      return t('muscleGroupBadge.group.calves', {}, { defaultValue: 'Calves' })
    case 'fullBody':
      return t('muscleGroupBadge.group.fullBody', {}, { defaultValue: 'Full body' })
  }
}

/**
 * MuscleGroupBadge component.
 *
 * Anatomical muscle-group badge — a small body-silhouette glyph with the
 * targeted muscle highlighted, plus a translated label. Used by
 * workout-tracker exercise-detail pages. The host IS the root `<span>`
 * (`span[mol-muscle-group-badge]`), matching React's root exactly; the pill's
 * accent, radius and padding are applied inline through host style bindings
 * (the CSSOM, as react-dom does), the recessed surface comes from the
 * ClassMap bond, and the layout and type classes come from the ClassMap bond.
 *
 * Two variants:
 * - `default` — glyph + label side-by-side.
 * - `compact` — glyph + label inline, smaller padding (good for chips).
 */
@Component({
  selector: 'span[mol-muscle-group-badge]',
  standalone: true,
  inputs: ['group', 'label', 'variant', 'size', 'accentColor', 'dataMolId', 'className'],
  host: {
    role: 'group',
    '[class]': 'classes()',
    '[attr.aria-label]': 'ariaLabel()',
    '[attr.data-mol-id]': 'dataMolId ?? "muscle-group-badge"',
    '[attr.data-group]': 'group',
    '[style.padding]': 'stylePadding()',
    '[style.border-radius]': 'styleBorderRadius()',
    '[style.border]': 'styleBorder()',
    '[style.display]': 'styleDisplay()',
  },
  template: `<svg
      [attr.width]="px()"
      [attr.height]="px()"
      [attr.viewBox]="'0 0 24 24'"
      aria-hidden="true"
      focusable="false"
    >
      <g fill="currentColor" fill-opacity="0.12" stroke="currentColor" stroke-opacity="0.4">
        <circle cx="12" cy="3.5" r="2"></circle>
        <path
          d="M7 6 h10 a1 1 0 0 1 1 1 v9 a1 1 0 0 1 -1 1 h-2 v5 h-2 v-5 h-2 v5 h-2 v-5 h-2 a1 1 0 0 1 -1 -1 v-9 a1 1 0 0 1 1 -1 z"
        ></path>
      </g>
      @switch (group) {
        @case ('chest') {
          <rect x="9" y="6.5" width="6" height="3" rx="1" [attr.fill]="accent()"></rect>
        }
        @case ('back') {
          <rect x="9" y="7" width="6" height="4" rx="1" [attr.fill]="accent()"></rect>
        }
        @case ('shoulders') {
          <g [attr.fill]="accent()">
            <circle cx="8.5" cy="6.5" r="1.4"></circle>
            <circle cx="15.5" cy="6.5" r="1.4"></circle>
          </g>
        }
        @case ('biceps') {
          <g [attr.fill]="accent()">
            <rect x="6" y="7.5" width="2" height="3.5" rx="1"></rect>
            <rect x="16" y="7.5" width="2" height="3.5" rx="1"></rect>
          </g>
        }
        @case ('triceps') {
          <g [attr.fill]="accent()">
            <rect x="5.5" y="9" width="2" height="3" rx="1"></rect>
            <rect x="16.5" y="9" width="2" height="3" rx="1"></rect>
          </g>
        }
        @case ('forearms') {
          <g [attr.fill]="accent()">
            <rect x="5" y="11" width="1.8" height="3" rx="0.6"></rect>
            <rect x="17.2" y="11" width="1.8" height="3" rx="0.6"></rect>
          </g>
        }
        @case ('core') {
          <rect x="10" y="10.5" width="4" height="4" rx="0.8" [attr.fill]="accent()"></rect>
        }
        @case ('glutes') {
          <rect x="9" y="14" width="6" height="2.5" rx="1" [attr.fill]="accent()"></rect>
        }
        @case ('quads') {
          <g [attr.fill]="accent()">
            <rect x="9" y="16" width="2.5" height="4" rx="0.8"></rect>
            <rect x="12.5" y="16" width="2.5" height="4" rx="0.8"></rect>
          </g>
        }
        @case ('hamstrings') {
          <g [attr.fill]="accent()">
            <rect x="9" y="17" width="2.5" height="3" rx="0.8" opacity="0.85"></rect>
            <rect x="12.5" y="17" width="2.5" height="3" rx="0.8" opacity="0.85"></rect>
          </g>
        }
        @case ('calves') {
          <g [attr.fill]="accent()">
            <rect x="9.5" y="20" width="2" height="2.5" rx="0.6"></rect>
            <rect x="12.5" y="20" width="2" height="2.5" rx="0.6"></rect>
          </g>
        }
        @case ('fullBody') {
          <rect
            x="6"
            y="3"
            width="12"
            height="19"
            rx="2"
            [attr.fill]="accent()"
            fill-opacity="0.2"
          ></rect>
        }
      }
    </svg>
    <span [class]="labelClasses()" data-mol-id="muscle-group-label">{{ resolvedLabel() }}</span>`,
})
export class MuscleGroupBadge {
  /** The muscle group represented by this badge. */
  group: MuscleGroup = 'chest'
  /** Override the auto-derived translated label. */
  label?: string
  /** Visual variant (`'default'` or `'compact'`; React's default is `'default'`). */
  variant?: 'default' | 'compact'
  /** Display size (`'sm'`, `'md'` or `'lg'`; React's default is `'md'`). */
  size?: 'sm' | 'md' | 'lg'
  /** Optional accent color override (CSS color). */
  accentColor?: string
  /** `data-mol-id` attribute for AI-agent selectors. */
  dataMolId?: string
  /** Extra classes appended via the ClassMap `cn()` helper. */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The variant in effect (a later-bound write of `undefined` must not erase
   * React's `'default'` default).
   * @returns The variant.
   */
  variantValue(): 'default' | 'compact' {
    return this.variant ?? 'default'
  }

  /**
   * The size in effect (React's `'md'` default).
   * @returns The display size.
   */
  sizeValue(): 'sm' | 'md' | 'lg' {
    return this.size ?? 'md'
  }

  /**
   * The accent color: the override, or the group's own hex.
   * @returns The CSS color.
   */
  accent(): string {
    return this.accentColor ?? ACCENT[this.group]
  }

  /**
   * The glyph's pixel size.
   * @returns The size in pixels.
   */
  px(): number {
    return SIZE_PX[this.sizeValue()]
  }

  /**
   * The badge's label: the prop, else the translated label (through the
   * group's literal key), else the English default.
   * @returns The label text.
   */
  resolvedLabel(): string {
    return this.label ?? translatedLabel(this.i18n.t, this.group)
  }

  /**
   * The group wrapper's accessible name.
   * @returns The aria-label text.
   */
  ariaLabel(): string {
    return this.i18n.t(
      'muscleGroupBadge.group',
      { name: this.resolvedLabel() },
      { defaultValue: '{{name}} muscle group' },
    )
  }

  /**
   * Computes the wrapper's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({
        align: 'center',
        gap: this.variantValue() === 'compact' ? 'xs' : 'sm',
      }),
      // The pill's recessed surface, from the theme.
      this.cm().surfaceSecondary,
      this.className,
    )
  }

  /**
   * Computes the label span's class list.
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(
      this.cm().textSize(this.variantValue() === 'compact' ? 'xs' : 'sm'),
      this.cm().fontWeight('semibold'),
    )
  }

  /**
   * The pill's padding.
   * @returns The padding value.
   */
  stylePadding(): string {
    return this.variantValue() === 'compact' ? '0.2rem 0.5rem' : '0.4rem 0.7rem'
  }

  /**
   * The pill's full radius.
   * @returns The border-radius value.
   */
  styleBorderRadius(): string {
    return '999px'
  }

  /**
   * The pill's accent border (the group's palette color — data, not a theme
   * tone).
   * @returns The border value.
   */
  styleBorder(): string {
    return `1px solid ${this.accent()}`
  }

  /**
   * The pill's layout display (React sets it inline, overriding `cm.flex`).
   * @returns The display value.
   */
  styleDisplay(): string {
    return 'inline-flex'
  }
}
