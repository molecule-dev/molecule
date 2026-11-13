/**
 * PageHeader component (React parity): page title area with breadcrumbs,
 * description and actions.
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  Renderer2,
  ViewChild,
} from '@angular/core'

import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleText } from '../utilities/style.js'
import { hasNodes, SlotWrapper } from './button.component.js'

/** One breadcrumb entry. */
interface Breadcrumb {
  /** The visible label. */
  label: string
  /** Link target; without it the crumb renders as a span. */
  href?: string
}

/**
 * PageHeader component.
 *
 * The host is the root `<div>` (`div[mol-page-header]`), exactly React's
 * root. `actions` is a node-valued prop, projected as `[slot=actions]`; its
 * wrapper `<div>` renders only when the slot carries nodes (React's
 * `{actions ? <div>…</div> : null}`), implemented by detaching the wrapper
 * from the DOM — the projected nodes need an always-mounted capture point.
 */
@Component({
  selector: 'div[mol-page-header]',
  standalone: true,
  inputs: ['title', 'description', 'breadcrumbs', 'className', 'style', 'testId', 'automationId'],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'automationId',
  },
  template: `@if (breadcrumbs && breadcrumbs.length > 0) {
      <nav [class]="cm().pageHeaderBreadcrumbs" aria-label="Breadcrumb">
        @for (crumb of breadcrumbs; track $index) {
          @if ($index > 0) {
            <span [class]="cm().pageHeaderBreadcrumbSeparator" aria-hidden="true">/</span>
          }
          @if (crumb.href) {
            <a [href]="crumb.href" [class]="cm().pageHeaderBreadcrumbItem">{{ crumb.label }}</a>
          } @else {
            <span [class]="cm().pageHeaderBreadcrumbItem">{{ crumb.label }}</span>
          }
        }
      </nav>
    }
    <div [class]="cm().flex({ justify: 'between', align: 'center' })">
      <div>
        <h1 [class]="cm().pageHeaderTitle">{{ title }}</h1>
        @if (description) {
          <p [class]="cm().pageHeaderDescription">{{ description }}</p>
        }
      </div>
      <div #actionsSlot [class]="cm().pageHeaderActions">
        <ng-content select="[slot=actions]"></ng-content>
      </div>
    </div>`,
})
export class PageHeader implements AfterViewInit, DoCheck {
  /** Page title. */
  title = ''
  /** Page description. */
  description?: string
  /** Breadcrumb trail (empty or absent renders no nav). */
  breadcrumbs?: Breadcrumb[]
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** `data-mol-id` automation id. */
  automationId?: string

  /** The actions wrapper (always in the template; detached when unused). */
  @ViewChild('actionsSlot') actionsSlot?: ElementRef<HTMLDivElement>

  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))
  private hasActions = false
  private actionsParent: HTMLElement | null = null

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the root class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().pageHeader, this.className)
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * Reads actions presence at view init (view queries resolve only then).
   */
  ngAfterViewInit(): void {
    this.actionsParent = this.actionsSlot?.nativeElement.parentElement ?? null
    this.hasActions = hasNodes(this.actionsSlot?.nativeElement)
    this.syncActions()
  }

  /**
   * Re-reconciles the actions wrapper on later passes.
   */
  ngDoCheck(): void {
    this.syncActions()
  }

  /**
   * Applies React's `{actions ? <div>…</div> : null}`.
   */
  private syncActions(): void {
    this.sync.sync(
      this.actionsSlot?.nativeElement,
      this.hasActions,
      this.actionsParent ?? undefined,
    )
  }
}
