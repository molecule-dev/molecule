/**
 * AuthBrandHeader component (React parity).
 *
 * @module
 */

import { Component, ElementRef, inject, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
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
  hostDirectives: [MolPlacement],
  host: {
    '[class]': 'classes()',
  },
  // The preset nodes come first and the projected children after them, so the
  // placement function asks the host whether the caller projected any child
  // below a fixed three-node preset. Only one set ever renders at a time, as
  // React's `{children ?? preset}` renders one.
  // prettier-ignore
  template: `<div #chip mol-auth-brand-header-chip [icon]="icon" [chipGradient]="chipGradient" [chipShape]="chipShape"></div><h1 #wordmark mol-auth-brand-header-wordmark [color]="wordmarkColor">{{ appNameText() }}</h1><p #tagline mol-auth-brand-header-tagline>{{ taglineText() }}</p><ng-content></ng-content>`,
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

  /** The preset chip (always in the template; detached while it does not render). */
  @ViewChild('chip', { static: true, read: ElementRef }) private chipEl?: ElementRef<HTMLElement>
  /** The preset wordmark (always in the template; detached while children render instead). */
  @ViewChild('wordmark', { static: true, read: ElementRef })
  private wordmarkEl?: ElementRef<HTMLElement>
  /** The preset tagline (always in the template; detached while children render instead). */
  @ViewChild('tagline', { static: true, read: ElementRef })
  private taglineEl?: ElementRef<HTMLElement>

  /** The component's host element, which holds the projected children. */
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  /**
   * i18n state. Its `t` reads the locale notifications, so the view refreshes
   * the text on a locale switch the way React re-renders on one.
   */
  readonly i18n = useTranslation()

  /**
   * Keeps the preset chip, wordmark and tagline on the page only while the
   * caller projects no children (and the chip only while `icon` is set), as
   * React's `{children ?? preset}` renders the preset only then. The preset
   * nodes are the host's first three children, so the projected children are
   * read after them; a preset taken away and put back follows the same rule.
   */
  constructor() {
    usePlacement((hasContent) => {
      const children = hasContent(this.host.nativeElement, 3)
      setElementPresent(this.chipEl?.nativeElement, !children && Boolean(this.icon))
      setElementPresent(this.wordmarkEl?.nativeElement, !children)
      setElementPresent(this.taglineEl?.nativeElement, !children)
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
