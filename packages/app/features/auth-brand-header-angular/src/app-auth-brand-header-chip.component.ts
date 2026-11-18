/**
 * AuthBrandHeaderChip component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * The gradient material-symbols chip shown above the wordmark.
 *
 * The host IS the outer `<div>` (`div[mol-auth-brand-header-chip]`), matching
 * React's root exactly; the `<span>` icon markup is the template.
 */
@Component({
  selector: 'div[mol-auth-brand-header-chip]',
  standalone: true,
  inputs: ['icon', 'chipGradient', 'chipShape'],
  host: {
    '[class]': 'classes()',
    '[style.background]': 'background()',
  },
  template:
    '<span [class]="iconClasses()" style="font-variation-settings: \'FILL\' 1" aria-hidden="true">{{ icon }}</span>',
})
export class AuthBrandHeaderChip {
  /** Material-symbol icon name shown inside the chip. */
  icon?: string
  /** CSS background value for the chip (a `linear-gradient(...)` or any CSS background). */
  chipGradient?: string
  /** Chip corner shape; defaults to `'round'` at read time. */
  chipShape?: 'round' | 'square'

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The chip's corner shape (React's default parameter: a later-bound write of
   * `undefined` must not erase the `'round'` default).
   * @returns The shape.
   */
  shape(): 'round' | 'square' {
    return this.chipShape ?? 'round'
  }

  /**
   * The chip wrapper's class list.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.w(12),
      cm.h(12),
      this.shape() === 'round' ? cm.roundedFull : '',
      cm.flex({ align: 'center', justify: 'center' }),
      cm.sp('mb', 2),
      this.shape() === 'square' ? cm.authBrandHeaderChipSquare : '',
      this.chipGradient ? '' : cm.bgPrimary,
      cm.authBrandHeaderChipShadow,
    )
  }

  /**
   * The inline background, applied only when the caller supplied a gradient so
   * the ClassMap's `bg-primary` fallback stays visible otherwise.
   * @returns The background, or null for none.
   */
  background(): string | null {
    return this.chipGradient || null
  }

  /**
   * The glyph `<span>`'s class list.
   * @returns The class string.
   */
  iconClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('3xl'), cm.iconGlyphFont, cm.authBrandHeaderChipIcon)
  }
}
