/**
 * SettingsSection component (React parity).
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

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasRenderableContent, hasText, isTemplate } from './slots.js'

/**
 * One configuration section inside a settings page.
 *
 * Card-wrapped, with a title / description header, body content and an
 * optional footer action row. The host IS the Card `<div>`
 * (`div[mol-settings-section]`), matching React's root exactly: the Card's
 * `elevated` variant, `md` padding and the callers' `className` /
 * `data-mol-id` are the host's. `title`, `description` and `footer` are
 * projected content (`[slot=title]`, `[slot=description]`, `[slot=footer]`)
 * or plain text; the optional regions render only when React would render
 * them.
 */
@Component({
  selector: 'div[mol-settings-section]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['title', 'description', 'footer', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  // prettier-ignore
  template: `<div [class]="innerClasses()"><header [class]="headerClasses()"><h2 [class]="titleClasses()">@if (titleTemplate(); as titleTpl) {<ng-container [ngTemplateOutlet]="titleTpl" />}@else if (hasTitleText()) {<ng-container>{{ textOf(title) }}</ng-container>}<ng-content select="[slot=title]"></ng-content></h2>@if (showDescription()) {<p #descriptionEl [class]="descriptionClasses()">@if (descriptionTemplate(); as descriptionTpl) {<ng-container [ngTemplateOutlet]="descriptionTpl" />}@else if (hasDescriptionText()) {<ng-container>{{ textOf(description) }}</ng-container>}<ng-content select="[slot=description]"></ng-content></p>}</header><div><ng-content></ng-content></div>@if (showFooter()) {<footer #footerEl [class]="footerClasses()">@if (footerTemplate(); as footerTpl) {<ng-container [ngTemplateOutlet]="footerTpl" />}@else if (hasFooterText()) {<ng-container>{{ textOf(footer) }}</ng-container>}<ng-content select="[slot=footer]"></ng-content></footer>}</div>`,
})
export class SettingsSection implements AfterViewInit {
  /** Section heading — a projected node template, or plain text. */
  title?: unknown
  /** Optional description under the heading — a projected node template, or plain text. */
  description?: unknown
  /** Section body, projected as the element's default content. */
  children?: unknown
  /** Optional footer row — a projected node template, or plain text. */
  footer?: unknown
  /** Extra classes on the Card. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The optional description paragraph (projected content lands here; read once). */
  @ViewChild('descriptionEl') private descriptionEl?: ElementRef<HTMLElement>
  /** The optional footer row (projected content lands here; read once). */
  @ViewChild('footerEl') private footerEl?: ElementRef<HTMLElement>

  /** Whether a `[slot=description]` projection landed (`null`: decided by the text input). */
  private readonly descriptionProjected = signal<boolean | null>(true)
  /** Whether a `[slot=footer]` projection landed (`null`: decided by the text input). */
  private readonly footerProjected = signal<boolean | null>(true)

  /**
   * Reads the optional regions' first render: when neither a text input nor
   * projected content landed, React would not render the region at all, so the
   * optimistic render is withdrawn.
   */
  ngAfterViewInit(): void {
    this.descriptionProjected.set(
      this.hasDescriptionText() ? null : hasRenderableContent(this.descriptionEl?.nativeElement),
    )
    this.footerProjected.set(
      this.hasFooterText() ? null : hasRenderableContent(this.footerEl?.nativeElement),
    )
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Renders a text value the way React renders a node string.
   * @param value - The prop value.
   * @returns The text to render, or `''` when there is nothing.
   */
  textOf(value: unknown): string {
    return value === null || value === undefined ? '' : String(value)
  }

  /**
   * The host's class list — Card's own computation with React's defaults
   * (`elevated` variant, `md` padding) and the caller's `className`.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().card({ variant: 'elevated' }),
      this.cm().cardPadding('md'),
      this.className,
    )
  }

  /**
   * The body stack's class (`cm.stack(4)`).
   * @returns The class string.
   */
  innerClasses(): string {
    return this.cm().stack(4)
  }

  /**
   * The header's class (`cm.stack(1)`).
   * @returns The class string.
   */
  headerClasses(): string {
    return this.cm().stack(1)
  }

  /**
   * The title's class list (`cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  titleClasses(): string {
    return this.cm().cn(this.cm().textSize('lg'), this.cm().fontWeight('semibold'))
  }

  /**
   * The description's class (`cm.textSize('sm')`).
   * @returns The class string.
   */
  descriptionClasses(): string {
    return this.cm().textSize('sm')
  }

  /**
   * The footer row's class (`cm.flex({ justify: 'end', align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  footerClasses(): string {
    return this.cm().flex({ justify: 'end', align: 'center', gap: 'sm' })
  }

  /**
   * The title as a template, when the caller passed a node.
   * @returns The title template, or null.
   */
  titleTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.title) ? this.title : null
  }

  /**
   * The description as a template, when the caller passed a node.
   * @returns The description template, or null.
   */
  descriptionTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.description) ? this.description : null
  }

  /**
   * The footer as a template, when the caller passed a node.
   * @returns The footer template, or null.
   */
  footerTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.footer) ? this.footer : null
  }

  /**
   * Whether the title input renders as text (React renders strings and numbers).
   * @returns True when the title is text.
   */
  hasTitleText(): boolean {
    return typeof this.title === 'string' || typeof this.title === 'number'
  }

  /**
   * Whether the description input renders as truthy text (React's `description && …`).
   * @returns True when the description text renders.
   */
  hasDescriptionText(): boolean {
    return hasText(this.description)
  }

  /**
   * Whether the footer input renders as truthy text (React's `footer && …`).
   * @returns True when the footer text renders.
   */
  hasFooterText(): boolean {
    return hasText(this.footer)
  }

  /**
   * Whether the description paragraph renders: React's `description && …` on
   * the text input, a template, or projected content.
   * @returns True when the paragraph shows.
   */
  showDescription(): boolean {
    return (
      this.hasDescriptionText() ||
      isTemplate(this.description) ||
      this.descriptionProjected() === true
    )
  }

  /**
   * Whether the footer row renders: React's `footer && …` on the text input, a
   * template, or projected content.
   * @returns True when the footer shows.
   */
  showFooter(): boolean {
    return this.hasFooterText() || isTemplate(this.footer) || this.footerProjected() === true
  }
}
