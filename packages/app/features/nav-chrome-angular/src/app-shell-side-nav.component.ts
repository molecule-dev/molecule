/**
 * AppShellSideNav component (React parity).
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

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { hasRenderableContent, hasText, isNodeTemplate } from './internal.js'
import type { NavGroup, NavItem } from './types.js'

/**
 * Vertical side nav shell.
 *
 * Pass either `items` for a flat list or `groups` for a sectioned layout
 * ("Main / Teams / Settings"). The host IS the `<aside>`
 * (`aside[mol-nav-side]`), matching React's root exactly. Node props
 * (`header`, `footer`) are projected content (`[slot=header]`,
 * `[slot=footer]`) or plain string inputs.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture point mounted, so the
 * optional footer region renders optimistically and
 * {@link AppShellSideNav.ngAfterViewInit} withdraws it when nothing was
 * projected into it (React would not render it at all).
 */
@Component({
  selector: 'aside[mol-nav-side]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['items', 'groups', 'activeId', 'onItemClick', 'header', 'footer', 'className'],
  host: { '[class]': 'classes()' },
  template: `@if (hasHeader) {
      <ng-container>{{ header }}</ng-container>
    }
    <ng-content select="[slot=header]"></ng-content>
    <nav [attr.aria-label]="navLabel()" [class]="navClasses()">
      @for (it of items ?? []; track it.id) {
        <ng-container
          [ngTemplateOutlet]="itemTpl"
          [ngTemplateOutletContext]="{ $implicit: it }"
        ></ng-container>
      }
      @for (g of groups ?? []; track g.id) {
        <section [class]="sectionClasses()">
          @if (g.heading) {
            <h3 [class]="headingClasses()">
              @if (isTemplate(g.heading)) {
                <ng-container [ngTemplateOutlet]="asTemplate(g.heading)"></ng-container>
              } @else {
                <ng-container>{{ g.heading }}</ng-container>
              }
            </h3>
          }
          @for (it of g.items; track it.id) {
            <ng-container
              [ngTemplateOutlet]="itemTpl"
              [ngTemplateOutletContext]="{ $implicit: it }"
            ></ng-container>
          }
        </section>
      }
    </nav>
    @if (showFooter) {
      <div #footerEl [class]="mountClass()">
        @if (hasTextFooter) {
          <ng-container>{{ footer }}</ng-container>
        }
        <ng-content select="[slot=footer]"></ng-content>
      </div>
    }
    <ng-template #itemTpl let-it
      ><button
        type="button"
        (click)="activate(it)"
        [disabled]="!!it.disabled"
        [attr.aria-current]="it.id === activeId ? 'page' : null"
        [class]="itemClasses(it)"
      >
        <span [class]="contentClasses()">
          @if (isTemplate(it.icon)) {
            <ng-container [ngTemplateOutlet]="asTemplate(it.icon)"></ng-container>
          } @else if (it.icon != null) {
            <ng-container>{{ it.icon }}</ng-container>
          }
          <span>
            @if (isTemplate(it.label)) {
              <ng-container [ngTemplateOutlet]="asTemplate(it.label)"></ng-container>
            } @else {
              <ng-container>{{ it.label }}</ng-container>
            }
          </span></span
        >
        @if (isTemplate(it.badge)) {
          <ng-container [ngTemplateOutlet]="asTemplate(it.badge)"></ng-container>
        } @else if (it.badge != null) {
          <ng-container>{{ it.badge }}</ng-container>
        }
      </button></ng-template
    >`,
})
export class AppShellSideNav implements AfterViewInit {
  /** Nav content: either a flat list of items or grouped sections. */
  items?: NavItem[]
  /** Grouped nav sections. */
  groups?: NavGroup[]
  /** Active item id. */
  activeId?: string
  /** Called when a nav item is clicked. */
  onItemClick?: (item: NavItem) => void
  /** Optional header slot — a string input or `[slot=header]` content. */
  header?: unknown
  /** Optional footer slot — a string input or `[slot=footer]` content. */
  footer?: unknown
  /** Extra classes. */
  className?: string

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The optional footer wrapper (projected content lands here; read once). */
  @ViewChild('footerEl') private footerEl?: ElementRef<HTMLDivElement>

  /**
   * Whether a `[slot=footer]` projection landed: true (optimistically) until
   * the first view proves otherwise.
   */
  private readonly footerProjected = signal(true)

  /**
   * Reads the footer wrapper's first render: when neither a text input nor
   * projected content landed, React would not render the region at all, so
   * the optimistic render is withdrawn.
   */
  ngAfterViewInit(): void {
    const footer = this.footerEl?.nativeElement
    if (footer) this.footerProjected.set(hasRenderableContent(footer))
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.stack(4), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().stack(4), this.className)
  }

  /**
   * The nav region's accessible name (prop-free: `t()` > English default).
   * @returns The nav region's label.
   */
  navLabel(): string {
    return this.i18n.t('navChrome.aria.sidebar', undefined, { defaultValue: 'Sidebar' })
  }

  /**
   * The nav class list (`cm.stack(4)`).
   * @returns The class string.
   */
  navClasses(): string {
    return this.cm().stack(4)
  }

  /**
   * One group section's class list (`cm.stack(1)`).
   * @returns The class string.
   */
  sectionClasses(): string {
    return this.cm().stack(1)
  }

  /**
   * A group heading's class list.
   * @returns The class string.
   */
  headingClasses(): string {
    return this.cm().cn(
      this.cm().textSize('xs'),
      this.cm().fontWeight('semibold'),
      this.cm().sp('px', 3),
    )
  }

  /**
   * The item label row's class list (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  contentClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'sm' })
  }

  /**
   * One nav item button's class list.
   * @param it - The nav item.
   * @returns The class string.
   */
  itemClasses(it: NavItem): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm', justify: 'between' }),
      this.cm().sp('px', 3),
      this.cm().sp('py', 2),
      this.cm().textSize('sm'),
      it.id === this.activeId ? this.cm().fontWeight('semibold') : this.cm().fontWeight('medium'),
    )
  }

  /**
   * React's `cm.sp('mt', 'auto')`. The spacing scale type omits `'auto'`, but
   * the bonded map renders the literal Tailwind class for it.
   * @returns The class string.
   */
  mountClass(): string {
    return this.cm().cn(this.cm().sp('mt', 'auto' as never))
  }

  /**
   * Whether a text header input renders (a projected header is not).
   * @returns True when the header input renders as text.
   */
  get hasHeader(): boolean {
    return hasText(this.header)
  }

  /**
   * Whether a text footer input renders.
   * @returns True when the footer input renders as text.
   */
  get hasTextFooter(): boolean {
    return hasText(this.footer)
  }

  /**
   * Whether the footer wrapper renders: a text input or a projected slot.
   * @returns True when the footer shows.
   */
  get showFooter(): boolean {
    return this.hasTextFooter || this.footerProjected()
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
   * The value as a template ref (checked by {@link AppShellSideNav.isTemplate} first).
   * @param value - The prop value.
   * @returns The template ref.
   */
  asTemplate(value: unknown): TemplateRef<unknown> {
    return value as TemplateRef<unknown>
  }

  /**
   * Activates a nav item (React's `onClick={() => onItemClick?.(it)}`).
   * @param it - The nav item.
   */
  activate(it: NavItem): void {
    this.onItemClick?.(it)
  }
}
