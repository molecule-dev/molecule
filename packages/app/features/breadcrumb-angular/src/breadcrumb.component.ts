/**
 * Breadcrumb component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  type ElementRef,
  type QueryList,
  signal,
  type TemplateRef,
  ViewChild,
  ViewChildren,
} from '@angular/core'

import {
  MolPlacement,
  placeContent,
  setElementPresent,
  type SlotReader,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import type { BreadcrumbItem } from './types.js'

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
  hostDirectives: [MolPlacement],
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
export class Breadcrumb {
  /** Ordered list of crumbs, last one usually the current page. */
  items: BreadcrumbItem[] = []
  /** Click handler invoked with the target `to` when a linked crumb is clicked. */
  onNavigate?: (to: string) => void
  /** Extra classes on the `<nav>` element. */
  className?: string
  /** `data-mol-id` for AI-agent selectors. */
  dataMolId?: string

  /** The separator slot capture span (kept out of the DOM once its content is placed). */
  @ViewChild('sepSlot') private sepSlot?: ElementRef<HTMLSpanElement>
  /** One empty span per gap, filled with the projected separator clones. */
  @ViewChildren('gapSep') private gapSeps?: QueryList<ElementRef<HTMLSpanElement>>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The projected separator nodes, cloned into every gap but the first. */
  private originals: Node[] = []

  /** The nodes this component created in each gap (default separators and clones). */
  private readonly created = new WeakMap<HTMLElement, Node[]>()

  /** Whether the caller projected a separator (drives the per-gap default's `@if`). */
  readonly customSeparator = signal(false)

  constructor() {
    usePlacement((hasContent) => this.placeSeparators(hasContent))
  }

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
   * Reads the projected separator and fills every gap: the projected content
   * in the first gap and a fresh clone in the others when the caller projected
   * a separator (React renders the same element in every gap; Angular projects
   * a node once), else the default `/` (built here, because the gap count
   * follows the items, which a template cannot fill from outside the loop).
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private placeSeparators(hasContent: SlotReader): void {
    const slot = this.sepSlot?.nativeElement
    if (!slot) return
    // The children are read where the capture rendered them, moved ones included.
    const originals = hasContent.nodes(slot)
    const present = originals.length > 0
    this.originals = originals
    this.customSeparator.set(present)
    setElementPresent(slot, false)
    this.fillGaps(present)
  }

  /**
   * Places the separator content in the first gap and clones it into the rest.
   *
   * @param present - Whether the caller projected a separator.
   */
  private fillGaps(present: boolean): void {
    const gaps = this.gapSeps?.toArray() ?? []
    const elements = gaps.map((ref) => ref.nativeElement)
    // Only the nodes this component created; the projected run's anchors stay.
    for (const gap of elements) this.clearCreated(gap)
    if (!present) {
      for (const gap of elements) {
        const separator = defaultSeparator()
        // eslint-disable-next-line molecule-local/no-hand-placed-nodes -- the default separator this component created, not a node Angular rendered
        gap.appendChild(separator)
        this.created.set(gap, [separator])
      }
      return
    }
    const [first, ...rest] = elements
    const capture = this.sepSlot?.nativeElement
    if (capture && first) placeContent(capture, first)
    for (const gap of rest) {
      const nodes = this.originals.map((original) => original.cloneNode(true))
      for (const node of nodes) {
        // eslint-disable-next-line molecule-local/no-hand-placed-nodes -- a copy this component made, not a node Angular rendered
        gap.appendChild(node)
      }
      this.created.set(gap, nodes)
    }
  }

  /**
   * Removes the nodes this component created in a gap, leaving Angular's.
   *
   * @param gap - The gap span.
   */
  private clearCreated(gap: HTMLElement): void {
    for (const node of this.created.get(gap) ?? []) {
      // eslint-disable-next-line molecule-local/no-hand-placed-nodes -- only the nodes this component created (above)
      node.parentNode?.removeChild(node)
    }
    this.created.delete(gap)
  }
}
