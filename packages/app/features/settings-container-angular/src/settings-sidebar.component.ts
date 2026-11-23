/**
 * SettingsSidebar component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import { Component, type ElementRef, signal, type TemplateRef, ViewChild } from '@angular/core'

import {
  MolPlacement,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasText, isTemplate, isText } from './slots.js'
import type { SettingsSidebarItem } from './types.js'

/**
 * Vertical side-nav for settings pages.
 *
 * Controlled — the caller owns `activeId`; every item calls `onSelect` with
 * its id. The host IS the `<nav>` (`nav[mol-settings-sidebar]`), matching
 * React's root exactly, including the region name: the default `aria-label`
 * resolves through `t()` with the `settingsContainer.aria.settings` key, so it
 * follows the active locale; `ariaLabel` overrides it. An item's `label` and
 * `icon` are projected node templates or plain text; the optional `footer` is
 * `[slot=footer]` content or text, and renders only when React would render it.
 */
@Component({
  selector: 'nav[mol-settings-sidebar]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [NgTemplateOutlet],
  inputs: ['items', 'activeId', 'onSelect', 'footer', 'ariaLabel', 'className'],
  host: {
    '[class]': 'classes()',
    '[attr.aria-label]': 'navLabel()',
  },
  // prettier-ignore
  template: `@for (item of items; track item.id) {<button type="button" [attr.aria-current]="item.id === activeId ? 'page' : null" [class]="itemClasses(item)" (click)="select(item)">@if (item.icon != null) {@if (isText(item.icon)) {<ng-container>{{ textOf(item.icon) }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(item.icon)" />}}<span>@if (isText(item.label)) {<ng-container>{{ textOf(item.label) }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(item.label)" />}</span></button>}<div #footerEl [class]="footerClasses()">@if (footerTemplate(); as footerTpl) {<ng-container [ngTemplateOutlet]="footerTpl" />}@else if (hasFooterText()) {<ng-container>{{ textOf(footer) }}</ng-container>}<ng-content select="[slot=footer]"></ng-content></div>`,
})
export class SettingsSidebar {
  /** Items to render, in order. */
  items: SettingsSidebarItem[] = []
  /** The id of the active item (controlled — the caller owns it). */
  activeId?: string
  /** Called with the clicked item's id. */
  onSelect?: (id: string) => void
  /** Optional footer — a template, `[slot=footer]` content, or plain text. */
  footer?: unknown
  /** Accessible label override; defaults to `t('settingsContainer.aria.settings', …)`. */
  ariaLabel?: string
  /** Extra classes. */
  className?: string

  /** The optional footer container (its projected nodes decide whether it shows). */
  @ViewChild('footerEl', { static: true }) private footerEl?: ElementRef<HTMLElement>

  /** Whether a `[slot=footer]` projection landed (placement decides). */
  private readonly footerShown = signal(false)

  /** The i18n provider access (locale-reactive through the notifications signal). */
  private readonly i18n = useTranslation()

  /**
   * Keeps the optional footer on the page only while it renders a text input, a
   * node template or projected content, re-decided whenever any of them changes
   * (a slot taken away and given back included).
   */
  constructor() {
    usePlacement((hasContent) => {
      const footerEl = this.footerEl?.nativeElement
      const showFooter =
        this.hasFooterText() || isTemplate(this.footer) || (footerEl ? hasContent(footerEl) : false)
      this.footerShown.set(showFooter)
      setElementPresent(footerEl, showFooter)
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
   * Renders a text value the way React renders a node string.
   * @param value - The prop value.
   * @returns The text to render, or `''` when there is nothing.
   */
  textOf(value: unknown): string {
    return value === null || value === undefined ? '' : String(value)
  }

  /**
   * Whether a value renders as text (React renders strings and numbers).
   * @param value - The prop value.
   * @returns True when the value renders as text.
   */
  isText(value: unknown): boolean {
    return isText(value)
  }

  /**
   * A data value's node template, when it is one.
   * @param value - The prop value.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return isTemplate(value) ? value : null
  }

  /**
   * The nav's class list (React's `cm.cn(cm.stack(1), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(1), this.className)
  }

  /**
   * The nav's accessible name (React's
   * `ariaLabel ?? t('settingsContainer.aria.settings', …)`).
   * @returns The label text.
   */
  navLabel(): string {
    return (
      this.ariaLabel ??
      this.i18n.t('settingsContainer.aria.settings', undefined, { defaultValue: 'Settings' })
    )
  }

  /**
   * One item's button class list, with React's active/inactive weight branch.
   * @param item - The item.
   * @returns The class string.
   */
  itemClasses(item: SettingsSidebarItem): string {
    const active = item.id === this.activeId
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('px', 3),
      this.cm().sp('py', 2),
      this.cm().textSize('sm'),
      active ? this.cm().fontWeight('semibold') : this.cm().fontWeight('medium'),
    )
  }

  /**
   * The footer container's class (`cm.sp('mt', 4)`).
   * @returns The class string.
   */
  footerClasses(): string {
    return this.cm().sp('mt', 4)
  }

  /**
   * The footer as a template, when the caller passed a node.
   * @returns The footer template, or null.
   */
  footerTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.footer) ? this.footer : null
  }

  /**
   * Whether the footer input renders as truthy text (React's `footer && …`).
   * @returns True when the footer text renders.
   */
  hasFooterText(): boolean {
    return hasText(this.footer)
  }

  /**
   * Whether the footer renders: React's `footer && …` on the text input, a
   * template, or projected content.
   * @returns True when the footer shows.
   */
  showFooter(): boolean {
    return this.hasFooterText() || isTemplate(this.footer) || this.footerShown()
  }

  /**
   * Activates an item (React's `onClick={() => onSelect(item.id)}`).
   * @param item - The clicked item.
   */
  select(item: SettingsSidebarItem): void {
    this.onSelect?.(item.id)
  }
}
