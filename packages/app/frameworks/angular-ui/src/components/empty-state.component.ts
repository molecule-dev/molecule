/**
 * EmptyState component (React parity).
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

/**
 * EmptyState component.
 *
 * Shown when a list or section has no data: an optional icon badge, a title,
 * a description, and an optional action slot. React renders the icon/action
 * wrapper divs only when those node props exist; here the wrappers always
 * exist as projection capture points and are detached when empty
 * ({@link SlotWrapper}).
 */
@Component({
  selector: 'div[mol-empty-state]',
  standalone: true,
  inputs: [
    'icon',
    'title',
    'description',
    'action',
    'className',
    'style',
    'testId',
    'automationId',
  ],
  host: {
    '[class]': 'classes()',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
    '[attr.data-mol-id]': 'automationId',
  },
  template: `<div [class]="cm().emptyStateIcon" #iconSlot>
      <ng-content select="[slot=icon]"></ng-content>
    </div>
    <h3 [class]="cm().emptyStateTitle">{{ title }}</h3>
    @if (description) {
      <p [class]="cm().emptyStateDescription">{{ description }}</p>
    }
    <div [class]="cm().emptyStateAction" #actionSlot>
      <ng-content select="[slot=action]"></ng-content>
    </div>`,
})
export class EmptyState implements AfterViewInit, DoCheck {
  /** An `icon` node prop (TemplateRef), when passed as a prop instead of a slot. */
  icon?: unknown
  /** Heading text. */
  title?: string
  /** Description text. */
  description?: string
  /** An `action` node prop (TemplateRef), when passed as a prop instead of a slot. */
  action?: unknown
  /** Extra classes. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string
  /** `data-mol-id`. */
  automationId?: string

  /** The icon wrapper (detached unless the slot captured nodes). */
  @ViewChild('iconSlot') iconSlot?: ElementRef<HTMLDivElement>
  /** The action wrapper. */
  @ViewChild('actionSlot') actionSlot?: ElementRef<HTMLDivElement>

  private hasIcon = false
  private hasAction = false

  private readonly sync = new SlotWrapper(inject(ElementRef), inject(Renderer2))

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the class list.
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().emptyState, this.className)
  }

  /**
   * Serializes the inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * Detects slot content and detaches the wrappers React would not render.
   * View queries resolve only by view init, so presence is read here.
   */
  ngAfterViewInit(): void {
    this.hasIcon =
      this.icon !== undefined && this.icon !== null ? true : hasNodes(this.iconSlot?.nativeElement)
    this.hasAction =
      this.action !== undefined && this.action !== null
        ? true
        : hasNodes(this.actionSlot?.nativeElement)
    this.syncWrappers()
  }

  /**
   * Re-reconciles wrappers on later passes.
   */
  ngDoCheck(): void {
    this.syncWrappers()
  }

  /**
   * Applies React's `{icon && <div>…}` / `{action && <div>…}` conditions.
   */
  private syncWrappers(): void {
    this.sync.sync(this.iconSlot?.nativeElement, this.hasIcon)
    this.sync.sync(this.actionSlot?.nativeElement, this.hasAction)
  }
}
