/**
 * ThemeToggle component (React parity).
 *
 * @module
 */

import { Component } from '@angular/core'

import { useTheme } from '@molecule/app-angular'
import { t } from '@molecule/app-i18n'
import type { IconName } from '@molecule/app-icons'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { Icon } from './icon.component.js'

/**
 * ThemeToggle component.
 *
 * Button that flips the wired theme bond between light and dark. The host is
 * the `<button>` itself (`button[mol-theme-toggle]`), matching React's root
 * exactly. Ships React's conventions out of the box: `data-mol-id`,
 * `data-mode`, `aria-pressed` and the `theme.toggle` i18n `aria-label`.
 * Extra attributes (`data-*`, `title`, …) land on the host — React's spread
 * target — and unknown props like `disabled` bind the host attribute
 * directly, so the browser suppresses the click exactly as React does.
 */
@Component({
  selector: 'button[mol-theme-toggle]',
  standalone: true,
  imports: [Icon],
  inputs: ['ariaLabelKey', 'ariaLabelDefault', 'darkIcon', 'lightIcon', 'iconSize', 'className'],
  host: {
    type: 'button',
    'data-mol-id': 'theme-toggle',
    '[attr.data-mode]': 'mode()',
    '[attr.aria-pressed]': 'mode() === "dark" ? "true" : "false"',
    '[attr.aria-label]': 'labelText()',
    '[class]': 'classes()',
    '(click)': 'theme.toggleTheme()',
  },
  template: `@if (mode() === 'dark') {
      <svg mol-icon-root [name]="darkIcon ?? 'moon'" [size]="iconSizePx()"></svg>
    } @else {
      <svg mol-icon-root [name]="lightIcon ?? 'sun'" [size]="iconSizePx()"></svg>
    }`,
})
export class ThemeToggle {
  /** i18n key for the `aria-label` (default `theme.toggle`). */
  ariaLabelKey?: string
  /** Fallback `aria-label` if the i18n key is missing. */
  ariaLabelDefault?: string
  /** Icon name rendered in dark mode (default `moon`). */
  darkIcon?: IconName
  /** Icon name rendered in light mode (default `sun`). */
  lightIcon?: IconName
  /** Pixel size for the rendered icon (default 20). */
  iconSize?: number
  /** Extra classes joined onto the toggle classes. */
  className?: string

  /** Theme state and actions, read in the component's injection context. */
  readonly theme = useTheme()

  /**
   * The current theme mode.
   * @returns `'light'` or `'dark'`.
   */
  mode(): 'light' | 'dark' {
    return this.theme.mode()
  }

  /**
   * The localized `aria-label`.
   * @returns The translated label text.
   */
  labelText(): string {
    return t(
      this.ariaLabelKey ?? 'theme.toggle',
      {},
      {
        defaultValue: this.ariaLabelDefault ?? 'Toggle theme',
      },
    )
  }

  /**
   * Computes the toggle class list.
   * @returns The class string.
   */
  classes(): string {
    const cm: UIClassMap = getClassMap()
    return cm.cn(cm.themeToggleButton, this.className)
  }

  /**
   * The rendered icon pixel size.
   * @returns The size (default 20 when a later-bound write left it unset).
   */
  iconSizePx(): number {
    return this.iconSize ?? 20
  }
}
