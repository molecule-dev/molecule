/**
 * The auth-shell primitives for Angular — the counterparts of
 * `@molecule/app-auth-shell-react`'s `AuthShellContainer`,
 * `AuthShellDecoration`, `AuthShellCard`, `AuthShellHeading`,
 * `AuthShellFooter` and `AuthShellBackLink`. Each host element IS React's root
 * element (attribute selector), so the DOM matches exactly.
 *
 * @module
 */

import { NgStyle } from '@angular/common'
import { Component } from '@angular/core'

import { Link, useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { AuthShellStyle } from './style.js'

/**
 * Outer full-screen container — centered flex (default) or a vertical column,
 * with optional background decoration.
 */
@Component({
  selector: 'div[mol-auth-shell-container]',
  standalone: true,
  inputs: ['className', 'layout'],
  host: { '[class]': 'classes()' },
  template: `<ng-content></ng-content>`,
})
export class AuthShellContainer {
  /** Extra classes appended after the defaults. */
  className?: string
  /** Layout direction (defaults to `'centered'` at read time). */
  layout?: 'centered' | 'column'

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list: the centered or column layout base plus `className`.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    const base =
      this.layout === 'column'
        ? cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), cm.authShellContainer)
        : cm.cn(
            cm.flex({ align: 'center', justify: 'center' }),
            cm.minH('screen'),
            cm.sp('p', 6),
            cm.authShellContainer,
          )
    return cm.cn(base, this.className)
  }
}

/**
 * Absolute-positioned background decoration layer — orbs, mesh gradients,
 * radial glows.
 */
@Component({
  selector: 'div[mol-auth-shell-decoration]',
  standalone: true,
  host: { '[class]': 'classes()' },
  template: `<ng-content></ng-content>`,
})
export class AuthShellDecoration {
  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The decoration layer's class.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().authShellDecoration)
  }
}

/**
 * The centered glassmorphic card surface: the host `<main>` is the outer
 * wrapper, and the inner `<div>` is the surface.
 */
@Component({
  selector: 'main[mol-auth-shell-card]',
  standalone: true,
  inputs: ['surfaceClassName', 'className', 'outerClassName', 'dataMolId'],
  host: { '[class]': 'outerClasses()' },
  template: `<div [class]="surfaceClasses()" [attr.data-mol-id]="dataMolId ?? null">
    <ng-content></ng-content>
  </div>`,
})
export class AuthShellCard {
  /** Override the default glass surface. */
  surfaceClassName?: string
  /** Extra layout classes appended after the flex/padding defaults. */
  className?: string
  /** Override the outer `<main>` wrapper classes. */
  outerClassName?: string
  /** `data-mol-id` pass-through for E2E selectors. */
  dataMolId?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The outer `<main>` class list (overridable, default full width).
   * @returns The class string.
   */
  outerClasses(): string {
    const cm = this.cm()
    return this.outerClassName ?? cm.cn(cm.w('full'), cm.authShellCardOuter)
  }

  /**
   * The inner surface class list: flex column + padding + surface + `className`.
   * @returns The class string.
   */
  surfaceClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ direction: 'col', gap: 'lg' }),
      cm.sp('p', 8),
      this.surfaceClassName ?? cm.authShellCardSurface,
      this.className,
    )
  }
}

/**
 * Centered heading block: optional eyebrow + h1 + optional subheading.
 */
@Component({
  selector: 'header[mol-auth-shell-heading]',
  standalone: true,
  imports: [NgStyle],
  inputs: ['heading', 'subheading', 'eyebrow', 'headingClassName', 'headingStyle'],
  host: { '[class]': 'headerClasses()' },
  template: `@if (eyebrow) {
      <span [class]="eyebrowClasses()">{{ eyebrow }}</span>
    }
    <h1 [class]="titleClasses()" [ngStyle]="headingStyle ?? null">{{ heading }}</h1>
    @if (subheading) {
      <p [class]="subheadingClasses()">{{ subheading }}</p>
    }`,
})
export class AuthShellHeading {
  /** The heading text. */
  heading = ''
  /** Optional subheading paragraph. */
  subheading?: string
  /** Optional small uppercase tag rendered above the heading. */
  eyebrow?: string
  /** Optional override for the h1 className. */
  headingClassName?: string
  /** Optional override for the h1 style. */
  headingStyle?: AuthShellStyle

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The header wrapper's class.
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().flex({ direction: 'col', align: 'center', gap: 'xs' })
  }

  /**
   * The eyebrow span's class.
   * @returns The class string.
   */
  eyebrowClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('xs'), cm.fontWeight('bold'), cm.authShellHeadingEyebrow)
  }

  /**
   * The h1's class, including the optional override.
   * @returns The class string.
   */
  titleClasses(): string {
    const cm = this.cm()
    return cm.cn(
      cm.textSize('2xl'),
      cm.fontWeight('bold'),
      cm.authShellHeadingTitle,
      this.headingClassName,
    )
  }

  /**
   * The subheading paragraph's class.
   * @returns The class string.
   */
  subheadingClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.textSize('sm'), cm.authShellHeadingSub)
  }
}

/**
 * Footer inside the card — small text with a top border.
 */
@Component({
  selector: 'footer[mol-auth-shell-footer]',
  standalone: true,
  host: { '[class]': 'classes()' },
  template: `<ng-content></ng-content>`,
})
export class AuthShellFooter {
  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The footer's class.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.textCenter, cm.textSize('sm'), cm.authShellFooter)
  }
}

/**
 * "Back to home" link (or custom destination) rendered below the card.
 *
 * The arrow's Material Symbols glyph span is `aria-hidden="true"`, so the
 * link's accessible name is its `t()` label alone.
 */
@Component({
  selector: 'p[mol-auth-shell-back-link]',
  standalone: true,
  imports: [Link],
  inputs: ['to', 'label'],
  host: { '[class]': 'classes()' },
  template: `<a [molLink]="toValue()" [class]="anchorClasses()"
    ><span [class]="glyphClasses()" style="font-size: 14px" aria-hidden="true">arrow_back</span
    >{{
      label?.trim()
        ? label
        : translation.t('auth.backHome', undefined, { defaultValue: 'Back to home' })
    }}</a
  >`,
})
export class AuthShellBackLink {
  /** Destination (defaults to `/` at read time). */
  to?: string
  /** Translated label override; falls back to `auth.backHome` → "Back to home" when absent, empty or blank. */
  label?: string

  /** The i18n translation function, reactive to locale switches. */
  readonly translation = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The destination (React's `to = '/'` default parameter).
   * @returns The path.
   */
  toValue(): string {
    return this.to ?? '/'
  }

  /**
   * The wrapping paragraph's class.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.textCenter, cm.textSize('xs'), cm.sp('mt', 6), cm.authShellBackLink)
  }

  /**
   * The anchor's class.
   * @returns The class string.
   */
  anchorClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ align: 'center', gap: 'xs' }), cm.authShellBackLinkAnchor)
  }

  /**
   * The icon glyph span's class.
   * @returns The class string.
   */
  glyphClasses(): string {
    const cm = this.cm()
    return cm.cn(cm.iconGlyphFont)
  }
}
