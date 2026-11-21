/**
 * StorefrontFooter component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type ElementRef,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { Link } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasRenderableContent, hasText, isNodeTemplate, nodeText } from './internal.js'
import type { FooterColumn } from './types.js'

/**
 * Storefront footer with brand block + columns + copyright.
 *
 * The host IS the `<footer>` (`footer[mol-storefront-footer]`), matching
 * React's root exactly. Node props (`brand`, `tagline`, `copyright`) are
 * projected content (`[slot=brand]`, `[slot=tagline]`, `[slot=copyright]`) or
 * plain text inputs; a node-valued heading or link label inside `columns`
 * arrives as an `ng-template` reference and renders through
 * `NgTemplateOutlet`. Same props and same DOM as
 * `@molecule/app-storefront-chrome-react`'s `StorefrontFooter`.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture point mounted, so the
 * optional tagline renders optimistically and
 * {@link StorefrontFooter.ngAfterViewInit} withdraws it when nothing was
 * projected into it (React would not render it at all).
 */
@Component({
  selector: 'footer[mol-storefront-footer]',
  standalone: true,
  imports: [Link, NgTemplateOutlet],
  inputs: ['brand', 'tagline', 'columns', 'copyright', 'className'],
  host: { '[class]': 'classes()' },
  // prettier-ignore
  template: `<div [class]="columnsClasses()"><div [class]="brandColClasses()"><div [class]="brandClasses()">@if (brandTemplate(); as brandTpl) {<ng-container [ngTemplateOutlet]="brandTpl"></ng-container>}@if (hasTextBrand()) {<ng-container>{{ brand }}</ng-container>}<span data-parity-unwrap><ng-content select="[slot=brand]"></ng-content></span></div>@if (showTagline()) {<p [class]="taglineClasses()">@if (taglineTemplate(); as taglineTpl) {<ng-container [ngTemplateOutlet]="taglineTpl"></ng-container>}@if (hasTextTagline()) {<ng-container>{{ tagline }}</ng-container>}<span #taglineSlot data-parity-unwrap><ng-content select="[slot=tagline]"></ng-content></span></p>}</div>@for (col of columns; track $index) {<div><h4 [class]="headingClasses()">@if (isTemplate(col.heading)) {<ng-container [ngTemplateOutlet]="asTemplate(col.heading)"></ng-container>}@if (hasText(col.heading)) {<ng-container>{{ headingText(col) }}</ng-container>}</h4><ul [class]="linkListClasses()">@for (link of col.links; track link.to) {<li><a [molLink]="link.to" [class]="linkClasses()">@if (isTemplate(link.label)) {<ng-container [ngTemplateOutlet]="asTemplate(link.label)"></ng-container>}@if (hasText(link.label)) {<ng-container>{{ linkText(link) }}</ng-container>}</a></li>}</ul></div>}</div><div [class]="dividerClasses()"><p [class]="copyrightClasses()">@if (copyrightTemplate(); as copyrightTpl) {<ng-container [ngTemplateOutlet]="copyrightTpl"></ng-container>}@if (hasTextCopyright()) {<ng-container>{{ copyright }}</ng-container>}<span data-parity-unwrap><ng-content select="[slot=copyright]"></ng-content></span></p></div>`,
})
export class StorefrontFooter implements AfterViewInit {
  /** The brand mark — a text input, or `[slot=brand]` projected content. */
  brand?: unknown
  /** Optional tagline — a text input, or `[slot=tagline]` projected content. */
  tagline?: unknown
  /** Columns of links. */
  columns?: FooterColumn[]
  /** The copyright line — a text input, or `[slot=copyright]` projected content. */
  copyright?: unknown
  /** Extra classes on the footer. */
  className?: string

  /** The tagline slot's capture point (projected content lands here; read once). */
  @ViewChild('taglineSlot') private taglineSlot?: ElementRef<HTMLSpanElement>

  /**
   * Whether `[slot=tagline]` projection landed: true (optimistically) until
   * the first view proves otherwise.
   */
  private readonly taglineProjected = signal(true)

  /**
   * Reads the tagline's capture point on the first render: when neither a text
   * input nor projected content landed, React would not render the paragraph at
   * all, so the optimistic render is withdrawn.
   */
  ngAfterViewInit(): void {
    const slot = this.taglineSlot?.nativeElement
    if (slot) this.taglineProjected.set(hasRenderableContent(slot))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The footer's class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().w('full'),
      this.cm().sp('pt', 16),
      this.cm().sp('pb', 8),
      this.cm().storefrontChromeFooter,
      this.className,
    )
  }

  /**
   * The columns container's class list.
   * @returns The class string.
   */
  columnsClasses(): string {
    return this.cm().cn(
      this.cm().maxW('[1280px]'),
      this.cm().mxAuto,
      this.cm().sp('px', 6),
      this.cm().grid({ cols: 1, gap: 'xl' }),
      this.cm().storefrontChromeFooterColumns,
    )
  }

  /**
   * The brand column's class list.
   * @returns The class string.
   */
  brandColClasses(): string {
    return this.cm().cn(this.cm().storefrontChromeFooterBrandCol)
  }

  /**
   * The brand block's class list.
   * @returns The class string.
   */
  brandClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xl'),
      this.cm().sp('mb', 4),
      this.cm().storefrontChromeFooterBrand,
    )
  }

  /**
   * The tagline's class list.
   * @returns The class string.
   */
  taglineClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().storefrontChromeFooterTagline)
  }

  /**
   * One column heading's class list.
   * @returns The class string.
   */
  headingClasses(): string {
    return this.cm().cn(
      this.cm().fontWeight('bold'),
      this.cm().sp('mb', 4),
      this.cm().textSize('sm'),
      this.cm().storefrontChromeFooterHeading,
    )
  }

  /**
   * A column's link list class (`cm.stack(2)`).
   * @returns The class string.
   */
  linkListClasses(): string {
    return this.cm().stack(2)
  }

  /**
   * One footer link's class list.
   * @returns The class string.
   */
  linkClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().storefrontChromeFooterLink)
  }

  /**
   * The divider row's class list.
   * @returns The class string.
   */
  dividerClasses(): string {
    return this.cm().cn(
      this.cm().maxW('[1280px]'),
      this.cm().mxAuto,
      this.cm().sp('px', 6),
      this.cm().sp('pt', 12),
      this.cm().sp('mt', 12),
      this.cm().storefrontChromeFooterDivider,
    )
  }

  /**
   * The copyright line's class list.
   * @returns The class string.
   */
  copyrightClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().storefrontChromeFooterCopyright)
  }

  /**
   * The brand as a template, when the caller passed a node as the input.
   * @returns The template, or null for text or projected content.
   */
  brandTemplate(): TemplateRef<unknown> | null {
    return isNodeTemplate(this.brand) ? this.brand : null
  }

  /**
   * The tagline as a template, when the caller passed a node as the input.
   * @returns The template, or null for text or projected content.
   */
  taglineTemplate(): TemplateRef<unknown> | null {
    return isNodeTemplate(this.tagline) ? this.tagline : null
  }

  /**
   * The copyright as a template, when the caller passed a node as the input.
   * @returns The template, or null for text or projected content.
   */
  copyrightTemplate(): TemplateRef<unknown> | null {
    return isNodeTemplate(this.copyright) ? this.copyright : null
  }

  /**
   * Whether the brand renders as a text input (projected brand content is not).
   * @returns True when the brand interpolates as text.
   */
  hasTextBrand(): boolean {
    return hasText(this.brand)
  }

  /**
   * Whether the tagline renders as a text input.
   * @returns True when the tagline interpolates as text.
   */
  hasTextTagline(): boolean {
    return hasText(this.tagline)
  }

  /**
   * Whether the copyright renders as a text input.
   * @returns True when the copyright interpolates as text.
   */
  hasTextCopyright(): boolean {
    return hasText(this.copyright)
  }

  /**
   * Whether the tagline paragraph renders: a text input or a projected slot
   * (React's `tagline ? … : null`).
   * @returns True when the tagline shows.
   */
  showTagline(): boolean {
    return this.hasTextTagline() || this.taglineProjected()
  }

  /**
   * The text of a column heading.
   * @param col - The column.
   * @returns The text.
   */
  headingText(col: FooterColumn): string {
    return nodeText(col.heading)
  }

  /**
   * The text of one footer link label.
   * @param link - The link.
   * @returns The text.
   */
  linkText(link: { to: string; label?: unknown }): string {
    return nodeText(link.label)
  }

  /**
   * Whether a value renders as text.
   * @param value - The field value.
   * @returns True when the value interpolates as text.
   */
  hasText(value: unknown): boolean {
    return hasText(value)
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
   * The value as a template ref (checked by {@link StorefrontFooter.isTemplate} first).
   * @param value - The prop value.
   * @returns The template ref.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }
}
