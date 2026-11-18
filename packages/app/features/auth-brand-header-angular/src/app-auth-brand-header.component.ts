/**
 * AuthBrandHeader component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { AuthBrandHeaderChip } from './app-auth-brand-header-chip.component.js'
import { AuthBrandHeaderTagline } from './app-auth-brand-header-tagline.component.js'
import { AuthBrandHeaderWordmark } from './app-auth-brand-header-wordmark.component.js'

/**
 * Centered auth-page brand header supporting both composable content and
 * preset mode.
 *
 * The host IS the outer `<div>` (`div[mol-auth-brand-header]`), matching
 * React's root exactly — a `<div>`, not `<header>`, because several hosts
 * render their own top bar on auth screens and a second `<header>` reads as a
 * duplicated app bar. Projected content renders in place of the preset, the
 * way React's `children` replaces its preset fragment.
 */
@Component({
  selector: 'div[mol-auth-brand-header]',
  standalone: true,
  imports: [AuthBrandHeaderChip, AuthBrandHeaderTagline, AuthBrandHeaderWordmark],
  inputs: ['className', 'appName', 'tagline', 'icon', 'chipGradient', 'chipShape', 'wordmarkColor'],
  host: {
    '[class]': 'classes()',
  },
  template: `<ng-content>
    @if (icon) {
      <div
        mol-auth-brand-header-chip
        [icon]="icon"
        [chipGradient]="chipGradient"
        [chipShape]="chipShape"
      ></div>
    }
    <h1 mol-auth-brand-header-wordmark [color]="wordmarkColor">{{ appNameText() }}</h1>
    <p mol-auth-brand-header-tagline>{{ taglineText() }}</p>
  </ng-content>`,
})
export class AuthBrandHeader {
  /** Extra classes appended to the wrapper `<div>`. */
  className?: string
  /** Brand name for the default wordmark. */
  appName?: string
  /** Tagline for the default tagline line. */
  tagline?: string
  /** Material-symbol icon name for the default chip (omit for no chip). */
  icon?: string
  /** CSS background for the default chip. */
  chipGradient?: string
  /** Default chip corner shape. */
  chipShape?: 'round' | 'square'
  /** Inline color for the default wordmark `<h1>`. */
  wordmarkColor?: string

  /**
   * i18n state. Its `t` reads the locale notifications, so the view refreshes
   * the text on a locale switch the way React re-renders on one.
   */
  readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper `<div>`'s class list.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ direction: 'col', align: 'center', gap: 'sm' }), this.className)
  }

  /**
   * The preset wordmark text.
   * @returns The translated brand name.
   */
  appNameText(): string {
    return this.i18n.t(
      'authBrandHeader.appName',
      { appName: this.appName ?? '' },
      { defaultValue: '{{appName}}' },
    )
  }

  /**
   * The preset tagline text.
   * @returns The translated tagline.
   */
  taglineText(): string {
    return this.i18n.t(
      'authBrandHeader.tagline',
      { tagline: this.tagline ?? '' },
      { defaultValue: '{{tagline}}' },
    )
  }
}
