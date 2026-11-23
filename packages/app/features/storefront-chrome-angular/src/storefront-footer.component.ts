/**
 * StorefrontFooter component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, ElementRef, inject, type TemplateRef, ViewChild } from '@angular/core'

import {
  Link,
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  type SlotReader,
  usePlacement,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasText, isNodeTemplate, nodeText } from './internal.js'
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
 * Each projected slot's capture span renders its content bare in place and
 * never reaches the page. The optional tagline paragraph stays in the template
 * so its `<ng-content>` captures, and leaves the page while it renders neither
 * a text input, a template nor projected content (React renders no paragraph
 * for a falsy `tagline`).
 */
@Component({
  selector: 'footer[mol-storefront-footer]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Link, NgTemplateOutlet],
  inputs: ['brand', 'tagline', 'columns', 'copyright', 'className'],
  host: { '[class]': 'classes()' },
  // prettier-ignore
  template: `<div [class]="columnsClasses()"><div [class]="brandColClasses()"><div [class]="brandClasses()">@if (brandTemplate(); as brandTpl) {<ng-container [ngTemplateOutlet]="brandTpl"></ng-container>}@if (hasTextBrand()) {<ng-container>{{ brand }}</ng-container>}<span #brandSlot><ng-content select="[slot=brand]"></ng-content></span></div><p #taglineParagraph [class]="taglineClasses()">@if (taglineTemplate(); as taglineTpl) {<ng-container [ngTemplateOutlet]="taglineTpl"></ng-container>}@if (hasTextTagline()) {<ng-container>{{ tagline }}</ng-container>}<span #taglineSlot><ng-content select="[slot=tagline]"></ng-content></span></p></div>@for (col of columns; track $index) {<div><h4 [class]="headingClasses()">@if (isTemplate(col.heading)) {<ng-container [ngTemplateOutlet]="asTemplate(col.heading)"></ng-container>}@if (hasText(col.heading)) {<ng-container>{{ headingText(col) }}</ng-container>}</h4><ul [class]="linkListClasses()">@for (link of col.links; track link.to) {<li><a [molLink]="link.to" [class]="linkClasses()">@if (isTemplate(link.label)) {<ng-container [ngTemplateOutlet]="asTemplate(link.label)"></ng-container>}@if (hasText(link.label)) {<ng-container>{{ linkText(link) }}</ng-container>}</a></li>}</ul></div>}</div><div [class]="dividerClasses()"><p [class]="copyrightClasses()">@if (copyrightTemplate(); as copyrightTpl) {<ng-container [ngTemplateOutlet]="copyrightTpl"></ng-container>}@if (hasTextCopyright()) {<ng-container>{{ copyright }}</ng-container>}<span #copyrightSlot><ng-content select="[slot=copyright]"></ng-content></span></p></div>`,
})
export class StorefrontFooter {
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

  /** The brand slot's capture point (projected content renders bare in place). */
  @ViewChild('brandSlot') private brandSlot?: ElementRef<HTMLElement>
  /** The tagline slot's capture point (projected content renders bare in place). */
  @ViewChild('taglineSlot', { static: true }) private taglineSlot?: ElementRef<HTMLSpanElement>
  /** The copyright slot's capture point (projected content renders bare in place). */
  @ViewChild('copyrightSlot') private copyrightSlot?: ElementRef<HTMLElement>

  /** The tagline paragraph (its text input, template or projected slot decides its presence). */
  @ViewChild('taglineParagraph', { static: true })
  private taglineParagraph?: ElementRef<HTMLParagraphElement>

  private readonly host: ElementRef<HTMLElement> = inject(ElementRef)

  constructor() {
    usePlacement((hasContent) => this.placeSlots(hasContent))
  }

  /**
   * Renders each slot's content bare in its place and takes the capture spans
   * out of the page, and keeps the tagline paragraph only while it renders a
   * text input, a template or projected content (React renders no paragraph
   * for a falsy `tagline`).
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private placeSlots(hasContent: SlotReader): void {
    const brand = this.brandSlot?.nativeElement
    if (brand) {
      hasContent(brand)
      placeContentBefore(brand, brand)
      setElementPresent(brand, false)
    }
    const copyright = this.copyrightSlot?.nativeElement
    if (copyright) {
      hasContent(copyright)
      placeContentBefore(copyright, copyright)
      setElementPresent(copyright, false)
    }
    const tagline = this.taglineSlot?.nativeElement
    const paragraph = this.taglineParagraph?.nativeElement
    if (tagline && paragraph) {
      setElementPresent(
        paragraph,
        this.hasTextTagline() || this.taglineTemplate() !== null || hasContent(tagline),
      )
      placeContentBefore(tagline, tagline)
      setElementPresent(tagline, false)
    }
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
