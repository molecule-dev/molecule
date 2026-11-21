/**
 * Breadcrumb component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewChecked,
  type AfterViewInit,
  Component,
  type ElementRef,
  type QueryList,
  signal,
  type TemplateRef,
  ViewChild,
  ViewChildren,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { BreadcrumbItem } from './types.js'

/**
 * Whether a projected node renders anything (an element, or text with
 * content beyond whitespace).
 *
 * @param node - The projected node.
 * @returns True when it renders.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

/**
 * Builds the default separator (React's `<span aria-hidden>/</span>`).
 *
 * @returns The default separator element.
 */
const defaultSeparator = (): HTMLSpanElement => {
  const el = document.createElement('span')
  el.setAttribute('aria-hidden', 'true')
  el.textContent = '/'
  return el
}

/**
 * Breadcrumb component.
 *
 * Breadcrumb navigation: each item before the last is a link; the last item
 * is plain text with `aria-current="page"`. The host IS the `<nav>`
 * (`nav[mol-breadcrumb]`), matching React's root exactly. With `onNavigate`,
 * linked crumbs render as `<button type="button">`s that call it; without,
 * they render as plain `<a href>` anchors.
 *
 * The separator renders once per gap: the projected `[slot=separator]`
 * content when given (cloned into every gap — Angular projects a node once,
 * React renders the same element in every gap), else the default
 * `<span aria-hidden>/</span>`.
 *
 * The nav's accessible name flows through `t()` with the English default
 * `'Breadcrumb'`, so it follows the app's locale.
 */
@Component({
  selector: 'nav[mol-breadcrumb]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['items', 'onNavigate', 'className', 'dataMolId'],
  host: {
    '[class]': 'classes()',
    '[attr.aria-label]': 'navLabel()',
    '[attr.data-mol-id]': 'dataMolId ?? null',
  },
  template: `@for (item of items; track $index) {
      <span [class]="crumbClasses()">
        @if (isLast($index) || !item.to) {
          <span [attr.aria-current]="isLast($index) ? 'page' : null">
            <ng-container
              [ngTemplateOutlet]="crumbContent"
              [ngTemplateOutletContext]="contentContext(item)"
            />
          </span>
        } @else if (onNavigate) {
          <button type="button" [class]="linkClasses()" (click)="navigate(item)">
            <ng-container
              [ngTemplateOutlet]="crumbContent"
              [ngTemplateOutletContext]="contentContext(item)"
            />
          </button>
        } @else {
          <a [attr.href]="item.to" [class]="linkClasses()">
            <ng-container
              [ngTemplateOutlet]="crumbContent"
              [ngTemplateOutletContext]="contentContext(item)"
            />
          </a>
        }
        @if (!isLast($index)) {
          <span #gapSep></span>
        }
      </span>
    }
    <ng-template #crumbContent let-icon="icon" let-label="label">
      <span [class]="contentClasses()">
        @if (isTemplate(icon)) {
          <ng-container [ngTemplateOutlet]="icon" />
        } @else if (icon != null) {
          {{ icon }}
        }
        @if (isTemplate(label)) {
          <ng-container [ngTemplateOutlet]="label" />
        } @else {
          {{ label }}
        }
      </span>
    </ng-template>
    <span #sepSlot><ng-content select="[slot=separator]"></ng-content></span>`,
})
export class Breadcrumb implements AfterViewInit, AfterViewChecked {
  /** Ordered list of crumbs, last one usually the current page. */
  items: BreadcrumbItem[] = []
  /** Click handler invoked with the target `to` when a linked crumb is clicked. */
  onNavigate?: (to: string) => void
  /** Extra classes on the `<nav>` element. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The separator slot capture span (moved out of the DOM once read). */
  @ViewChild('sepSlot') private sepSlot?: ElementRef<HTMLSpanElement>
  /** One empty span per gap, filled with the projected separator clones. */
  @ViewChildren('gapSep') private gapSeps?: QueryList<ElementRef<HTMLSpanElement>>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The projected separator nodes, cloned into every gap but the first. */
  private originals: Node[] = []

  /** Whether the caller projected a separator (drives the per-gap default's `@if`). */
  readonly customSeparator = signal(false)

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The nav class list (React's
   * `cm.cn(cm.flex({ align, gap, wrap }), cm.textSize('sm'), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'xs', wrap: 'wrap' }),
      this.cm().textSize('sm'),
      this.className,
    )
  }

  /**
   * The nav's accessible name (React's `aria-label`): prop-less `t()` with
   * the English default `'Breadcrumb'`, re-read on a locale switch (the `t`
   * call reads the locale notifications signal, so the host binding
   * re-evaluates on one).
   * @returns The translated nav label.
   */
  navLabel(): string {
    return this.i18n.t('breadcrumb.aria.breadcrumb', undefined, { defaultValue: 'Breadcrumb' })
  }

  /**
   * The crumb wrapper's class (`cm.flex({ align: 'center', gap: 'xs' })`).
   * @returns The class string.
   */
  crumbClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs' })
  }

  /**
   * The icon/label row's class (`cm.flex({ align: 'center', gap: 'xs' })`).
   * @returns The class string.
   */
  contentClasses(): string {
    return this.cm().flex({ align: 'center', gap: 'xs' })
  }

  /**
   * The link crumb's class (`cm.link`), through `cn()` so a token that is a
   * function in a bonded map resolves to its string (Angular's classMap
   * binding rejects functions).
   * @returns The class string.
   */
  linkClasses(): string {
    return this.cm().cn(this.cm().link)
  }

  /**
   * Whether the crumb at the position is the current page.
   * @param index - The crumb's position.
   * @returns True for the last crumb.
   */
  isLast(index: number): boolean {
    return index === this.items.length - 1
  }

  /**
   * The icon/label context the shared crumb template renders.
   * @param item - The crumb.
   * @returns The template context.
   */
  contentContext(item: BreadcrumbItem): { icon: unknown; label: unknown } {
    return { icon: item.icon, label: item.label }
  }

  /**
   * Whether the value is a node template (a node-valued prop's Angular
   * representation). Checked structurally — `TemplateRef` is a type-only
   * import here, and the check must survive any bundler.
   * @param value - The prop value.
   * @returns True for a template ref.
   */
  isTemplate(value: unknown): value is TemplateRef<unknown> {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'
    )
  }

  /**
   * Activates a linked crumb (React's `onClick={() => onNavigate(item.to!)}`).
   * @param item - The crumb.
   */
  navigate(item: BreadcrumbItem): void {
    if (item.to != null && item.to !== '') this.onNavigate?.(item.to)
  }

  /**
   * Reads slot presence (view queries resolve only at view init), keeps the
   * projected separator nodes and removes the capture span — React renders
   * the separator bare, once per gap.
   */
  ngAfterViewInit(): void {
    const slot = this.sepSlot?.nativeElement
    if (!slot) return
    this.originals = Array.from(slot.childNodes).filter(hasRenderable)
    slot.remove()
    this.customSeparator.set(this.originals.length > 0)
  }

  /**
   * Fills every empty gap with the separator: the projected nodes in the
   * first gap and a fresh clone in the others when the caller projected a
   * separator (React renders the same element in every gap; Angular projects
   * a node once), else the default `/` (built here, because the gap count
   * follows the items, which a template cannot fill from outside the loop).
   */
  ngAfterViewChecked(): void {
    const gaps = this.gapSeps ?? []
    gaps.forEach((ref, i) => {
      const gap = ref.nativeElement
      if (gap.childNodes.length > 0) return
      if (!this.customSeparator()) {
        gap.appendChild(defaultSeparator())
        return
      }
      const nodes = i === 0 ? this.originals : this.originals.map((node) => node.cloneNode(true))
      for (const node of nodes) gap.appendChild(node)
    })
  }
}
