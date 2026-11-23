/**
 * AppShellFooter component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, type TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasText, isNodeTemplate } from './internal.js'
import type { FooterLink } from './types.js'

/**
 * Bottom page footer shell.
 *
 * All content is optional — apps mix and match logo / copyright / links /
 * right-slot as the design demands. The host IS the `<footer>`
 * (`footer[mol-nav-footer]`), matching React's root exactly. Node props
 * (`logo`, `copyright`, `right`) are projected content (`[slot=<name>]`) or
 * plain string inputs.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture point mounted, so the
 * optional copyright span stays in the template and leaves the page when
 * nothing was projected into it, as React's `{copyright && …}` renders no span.
 */
@Component({
  selector: 'footer[mol-nav-footer]',
  standalone: true,
  imports: [NgTemplateOutlet],
  hostDirectives: [MolPlacement],
  inputs: ['logo', 'copyright', 'links', 'right', 'className'],
  host: { '[class]': 'classes()' },
  template: `<div [class]="rowClasses()">
      @if (hasLogo) {
        <ng-container>{{ logo }}</ng-container>
      }
      <ng-content select="[slot=logo]"></ng-content>
      <span #copyrightEl [class]="copyrightClass()">
        @if (hasTextCopyright) {
          <ng-container>{{ copyright }}</ng-container>
        }
        <ng-content select="[slot=copyright]"></ng-content
      ></span>
    </div>
    @if (links && links.length > 0) {
      <nav [attr.aria-label]="navLabel()" [class]="linksClasses()">
        @for (l of links; track $index) {
          <a [attr.href]="l.to ?? '#'" [class]="linkClass()">
            @if (isTemplate(l.label)) {
              <ng-container [ngTemplateOutlet]="asTemplate(l.label)"></ng-container>
            } @else {
              <ng-container>{{ l.label }}</ng-container>
            }
          </a>
        }
      </nav>
    }
    @if (hasRight) {
      <ng-container>{{ right }}</ng-container>
    }
    <ng-content select="[slot=right]"></ng-content>`,
})
export class AppShellFooter {
  /** Optional brand / logo — a string input or `[slot=logo]` content. */
  logo?: unknown
  /** Optional copyright text — a string input or `[slot=copyright]` content. */
  copyright?: unknown
  /** Footer links — rendered in a row. */
  links?: FooterLink[]
  /** Optional right-side slot — a string input or `[slot=right]` content. */
  right?: unknown
  /** Extra classes. */
  className?: string

  /** The optional copyright span (always in the template; detached while empty). */
  @ViewChild('copyrightEl', { static: true }) private copyrightEl?: ElementRef<HTMLSpanElement>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /**
   * Keeps the copyright span on the page only while it renders a text input
   * or projected `[slot=copyright]` content, re-decided whenever either
   * changes (a copyright taken away and given back included).
   */
  constructor() {
    usePlacement((hasContent) => {
      const el = this.copyrightEl?.nativeElement
      setElementPresent(el, this.hasTextCopyright || (el ? hasContent(el) : false))
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
   * The wrapper class list (React's `cm.cn(cm.flex(...), cm.sp(...), cm.sp(...), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
      this.cm().sp('px', 4),
      this.cm().sp('py', 4),
      this.className,
    )
  }

  /**
   * The links nav region's accessible name (prop-free: `t()` > English default).
   * @returns The nav region's label.
   */
  navLabel(): string {
    return this.i18n.t('navChrome.aria.footer', undefined, { defaultValue: 'Footer' })
  }

  /**
   * The logo/copyright row's class list (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * The links nav's class list (`cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' })`).
   * @returns The class string.
   */
  linksClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'md', wrap: 'wrap' })
  }

  /**
   * One footer link's class list (React's `cm.cn(cm.textSize('sm'), cm.link)`).
   * @returns The class string.
   */
  linkClass(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().link)
  }

  /**
   * The copyright span's class list (`cm.textSize('xs')`).
   * @returns The class string.
   */
  copyrightClass(): string {
    return this.cm().textSize('xs')
  }

  /**
   * Whether a text logo input renders (a projected logo is not).
   * @returns True when the logo input renders as text.
   */
  get hasLogo(): boolean {
    return hasText(this.logo)
  }

  /**
   * Whether a text copyright input renders.
   * @returns True when the copyright input renders as text.
   */
  get hasTextCopyright(): boolean {
    return hasText(this.copyright)
  }

  /**
   * Whether a text right-slot input renders.
   * @returns True when the right input renders as text.
   */
  get hasRight(): boolean {
    return hasText(this.right)
  }

  /**
   * Whether the value is a node template.
   * @param value - The prop value.
   * @returns True for a template ref.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return isNodeTemplate(value)
  }

  /**
   * The value as a template ref (checked by {@link AppShellFooter.isTemplate} first).
   * @param value - The prop value.
   * @returns The template ref.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }
}
