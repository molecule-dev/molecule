/**
 * TrendChip component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { ColorVariant, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

const ARROW = { up: '▲', down: '▼', flat: '–' } as const

/**
 * The semantic tone colouring each direction: the theme's success green for a
 * rise, its error red for a fall, its muted secondary grey for no change.
 */
const TONE: Record<'up' | 'down' | 'flat', ColorVariant> = {
  up: 'success',
  down: 'error',
  flat: 'secondary',
} as const

/**
 * TrendChip component.
 *
 * Standalone trend delta chip — `▲ 12%` style display for inline placement in
 * row/header/cell contexts. The host IS the root `<span>`
 * (`span[mol-trend-chip]`), matching React's root exactly. Colors come from
 * the ClassMap bond's semantic tones and follow the app theme; only the
 * pill's padding and radius are inline, through host style bindings (the
 * CSSOM, as react-dom does). Same props, same DOM as
 * `@molecule/app-trend-chip-react`'s `TrendChip`. Node-valued `prefix`
 * content is projected from `[slot=prefix]`; a string or number `prefix`
 * input renders as text and feeds the default aria label.
 */
@Component({
  selector: 'span[mol-trend-chip]',
  standalone: true,
  inputs: ['delta', 'direction', 'suffix', 'prefix', 'variant', 'ariaLabel', 'className'],
  host: {
    '[class]': 'classes()',
    '[style.padding]': 'stylePadding()',
    '[style.border-radius]': 'styleRadius()',
    '[attr.aria-label]': 'label()',
  },
  template: `@if (hasPrefix) {
      <ng-container>{{ prefixValue }}</ng-container>
    }
    <ng-content select="[slot=prefix]"></ng-content><span aria-hidden="true">{{ arrow() }}</span
    ><span>{{ abs() }}{{ suffixValue() }}</span>`,
})
export class TrendChip {
  /** Numeric delta to display. Sign drives direction unless `direction` is set. */
  delta = 0
  /** Explicit direction override. */
  direction?: 'up' | 'down' | 'flat'
  /** Suffix appended to the delta. */
  suffix = '%'
  /** Prefix value: rendered as text; a node prefix is projected content instead. */
  prefix?: string | number
  /** Style preset. */
  variant = 'subtle'
  /** Optional accessible label override. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The effective direction: the override, or the delta's sign.
   * @returns `'up'`, `'down'` or `'flat'`.
   */
  dir(): 'up' | 'down' | 'flat' {
    return this.direction ?? (this.delta > 0 ? 'up' : this.delta < 0 ? 'down' : 'flat')
  }

  /**
   * Whether the pill preset is active.
   * @returns True for `variant: 'pill'`.
   */
  isPill(): boolean {
    return this.variant === 'pill'
  }

  /**
   * The semantic tone of the current direction.
   * @returns The {@link ColorVariant} tone.
   */
  tone(): ColorVariant {
    return TONE[this.dir()]
  }

  /**
   * The tone classes: the theme's inverse text on the tone's fill for the
   * pill preset, the tone as text colour otherwise.
   * @returns The class string.
   */
  toneClasses(): string {
    return this.isPill()
      ? this.cm().cn(this.cm().bgTone(this.tone()), this.cm().textOnTone)
      : this.cm().textTone(this.tone())
  }

  /**
   * Computes the chip's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs' }),
      this.cm().textSize('xs'),
      this.cm().fontWeight('semibold'),
      this.toneClasses(),
      this.className,
    )
  }

  /**
   * The pill's horizontal padding (absent for the subtle preset).
   * @returns The padding, or null to clear the property.
   */
  stylePadding(): string | null {
    return this.isPill() ? '2px 6px' : null
  }

  /**
   * The pill's full rounding (absent for the subtle preset).
   * @returns The radius, or null to clear the property.
   */
  styleRadius(): string | null {
    return this.isPill() ? '999px' : null
  }

  /**
   * Whether a string or number prefix is present (a projected node prefix is
   * not).
   * @returns True when the prefix input renders as text.
   */
  get hasPrefix(): boolean {
    return this.prefix !== undefined && this.prefix !== null && this.prefix !== ''
  }

  /**
   * The prefix value to render as text.
   * @returns The prefix, or `''` when absent.
   */
  get prefixValue(): string | number {
    return this.prefix === undefined || this.prefix === null || this.prefix === ''
      ? ''
      : this.prefix
  }

  /**
   * The accessible label: the override, or the value the chip renders.
   * @returns The label text.
   */
  label(): string {
    return (
      this.ariaLabel ?? `${this.prefixValue}${ARROW[this.dir()]} ${this.abs()}${this.suffixValue()}`
    )
  }

  /**
   * The arrow of the effective direction.
   * @returns The arrow character.
   */
  arrow(): string {
    return ARROW[this.dir()]
  }

  /**
   * The delta's magnitude.
   * @returns `Math.abs(delta)`.
   */
  abs(): number {
    return Math.abs(this.delta)
  }

  /**
   * The suffix in effect (React's default parameter: a `undefined` binding
   * must not erase the `'%'` default).
   * @returns The suffix.
   */
  suffixValue(): string {
    return this.suffix ?? '%'
  }
}
