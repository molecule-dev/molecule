/**
 * The two-column split auth-layout family for Angular — the counterparts of
 * `@molecule/app-auth-shell-react`'s `AuthShellSplit`,
 * `AuthShellSplitRow`, `AuthShellPanel` and `AuthShellCardColumn`.
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeElementBefore,
  setElementPresent,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Outer min-h-screen flex-column frame for the two-column brand-panel + card
 * auth layout.
 */
@Component({
  selector: 'div[mol-auth-shell-split]',
  standalone: true,
  inputs: ['className'],
  host: { '[class]': 'classes()' },
  template: `<ng-content></ng-content>`,
})
export class AuthShellSplit {
  /** Cosmetic classes (background, text color, font) for the outer container. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The outer frame's class.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.flex({ direction: 'col' }), cm.minH('screen'), this.className)
  }
}

/**
 * The vertically-flexed two-column row inside `<AuthShellSplit>`.
 */
@Component({
  selector: 'main[mol-auth-shell-split-row]',
  standalone: true,
  inputs: ['className'],
  host: { '[class]': 'classes()' },
  template: `<ng-content></ng-content>`,
})
export class AuthShellSplitRow {
  /** Layout classes for the row (typically `cm.flex({})` or `cm.grid({ cols: 2 })`). */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The row's class (`cm.flex1` + `className`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.flex1, this.className)
  }
}

/**
 * A decorative `<aside>` that collapses on mobile (the brand-panel half).
 */
@Component({
  selector: 'aside[mol-auth-shell-panel]',
  standalone: true,
  inputs: ['className'],
  host: { '[class]': 'classes()' },
  template: `<ng-content></ng-content>`,
})
export class AuthShellPanel {
  /** Cosmetic classes — width ratio, padding, gradient, positioning. */
  className?: string

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The panel's class (`cm.authShellPanel` + `className`).
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(cm.authShellPanel, this.className)
  }
}

/**
 * A centered `<section>` (or `<main>`, via `as`) that holds the form card.
 *
 * React's root is that element and nothing else, so it renders in front of the
 * host's place and the host itself leaves the page (`placeElementBefore` +
 * `setElementPresent`): the rendered `<section>`/`<main>` is exactly React's
 * root. In an Angular template, you can also choose the tag directly
 * (`<main molAuthShellCardColumn>`).
 */
@Component({
  selector: 'mol-auth-shell-card-column',
  standalone: true,
  imports: [NgTemplateOutlet],
  hostDirectives: [MolPlacement],
  inputs: ['className', 'as'],
  template: `<ng-template #inner><ng-content></ng-content></ng-template>
    @if (isMain()) {
      <main #mainRoot [class]="classes()">
        <ng-container [ngTemplateOutlet]="inner"></ng-container>
      </main>
    } @else {
      <section #sectionRoot [class]="classes()">
        <ng-container [ngTemplateOutlet]="inner"></ng-container>
      </section>
    }`,
})
export class AuthShellCardColumn {
  /** Cosmetic classes — width ratio, padding. */
  className?: string
  /** Element to render. Defaults to `'section'`. */
  as?: 'section' | 'main'

  /** React's `<main>` root, when `as` is `'main'`. */
  @ViewChild('mainRoot') private mainRoot?: ElementRef<HTMLElement>
  /** React's `<section>` root otherwise. */
  @ViewChild('sectionRoot') private sectionRoot?: ElementRef<HTMLElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    // React's root is the `<section>`/`<main>` itself: it renders in front of the host's
    // place and the host leaves the page.
    usePlacement(() => {
      const root = this.mainRoot?.nativeElement ?? this.sectionRoot?.nativeElement
      if (root) placeElementBefore(root, this.host.nativeElement)
      setElementPresent(this.host.nativeElement, false)
    })
  }

  /**
   * Whether the column renders as `<main>` (React's `as === 'main'`; `as` is a
   * reserved word in Angular template expressions, so it is read here).
   * @returns True when the element should be `<main>`.
   */
  isMain(): boolean {
    return this.as === 'main'
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The column's class.
   * @returns The class string.
   */
  classes(): string {
    const cm = this.cm()
    return cm.cn(
      cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
      cm.minW(0),
      this.className,
    )
  }
}
