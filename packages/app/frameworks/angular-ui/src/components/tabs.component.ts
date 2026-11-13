/**
 * Tabs component (React parity).
 *
 * @module
 */

import {
  Component,
  type ElementRef,
  EventEmitter,
  type OnInit,
  Output,
  type QueryList,
  signal,
  TemplateRef,
  ViewChildren,
} from '@angular/core'

import type { TabItem, UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { nextInstanceId } from '../utilities/ids.js'
import { styleText } from '../utilities/style.js'
import { MolTemplateOutlet } from './template-outlet.directive.js'

/**
 * Tabs component.
 *
 * The host is the root `<div>` (`div[mol-tabs]`). Implements the WAI-ARIA APG
 * "automatic activation" tabs pattern: roving tabindex, Left/Right/Home/End
 * move both focus and the active tab, and disabled tabs are skipped. Item
 * `icon` and `content` are node values (templates); `label` is a string or a
 * node value.
 */
@Component({
  selector: 'div[mol-tabs]',
  standalone: true,
  imports: [MolTemplateOutlet],
  inputs: [
    'items',
    'value',
    'defaultValue',
    'variant',
    'size',
    'fitted',
    'className',
    'style',
    'testId',
  ],
  outputs: ['change'],
  host: {
    '[class]': 'className',
    '[style]': 'hostStyle()',
    '[attr.data-testid]': 'testId',
  },
  template: `<div [class]="listClasses()" role="tablist" (keydown)="handleKeyDown($event)">
      @for (item of items; track item.value) {
        <button
          #tabBtn
          [id]="tabId(item.value)"
          type="button"
          role="tab"
          [attr.aria-selected]="item.value === activeValue() ? 'true' : 'false'"
          [attr.aria-controls]="panelId(item.value)"
          [attr.data-state]="item.value === activeValue() ? 'active' : 'inactive'"
          [attr.tabindex]="item.value === activeValue() ? 0 : -1"
          [disabled]="!!item.disabled"
          (click)="selectTab(item.value)"
          [class]="triggerClasses()"
        >
          @if (item.icon) {
            <span [class]="cm().tabTriggerIcon">
              @if (asTemplate(item.icon); as iconTpl) {
                <ng-container [molTemplateOutlet]="iconTpl"></ng-container>
              } @else {
                {{ nodeText(item.icon) }}
              }
            </span>
          }
          @if (asTemplate(item.label); as labelTpl) {
            <ng-container [molTemplateOutlet]="labelTpl"></ng-container>
          } @else {
            {{ nodeText(item.label) }}
          }
        </button>
      }
    </div>
    @if (hasContent()) {
      <div
        role="tabpanel"
        [id]="panelId(activeValue() ?? '')"
        [attr.aria-labelledby]="tabId(activeValue() ?? '')"
        [class]="contentClasses()"
      >
        @if (activeContent(); as contentTpl) {
          <ng-container [molTemplateOutlet]="contentTpl"></ng-container>
        } @else {
          {{ contentText() }}
        }
      </div>
    }`,
})
export class Tabs implements OnInit {
  /** The tabs. */
  items: TabItem<string>[] = []
  /** Controlled active value. */
  value?: string
  /** Initial active value for the uncontrolled form. */
  defaultValue?: string
  /** Tab-list visual variant. */
  variant?: 'line' | 'enclosed' | 'soft-rounded' | 'solid-rounded'
  /** Tab size. */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Whether tabs stretch to fill the list. */
  fitted?: boolean
  /** Extra classes for the root. */
  className?: string
  /** Inline style object (React camelCase). */
  style?: Record<string, unknown>
  /** `data-testid`. */
  testId?: string

  /** Fires with the selected tab's value (React's `onChange`). */
  @Output() readonly change = new EventEmitter<string>()

  /** The tab buttons (for focus movement). */
  @ViewChildren('tabBtn') tabButtons?: QueryList<ElementRef<HTMLButtonElement>>
  /** The per-instance id base (the normalizer renumbers ids). */
  readonly idBase = nextInstanceId()
  /** The uncontrolled active value. */
  private readonly internalValue = signal<string | undefined>(undefined)

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Seeds the uncontrolled value once, at mount, like React's
   * `useState(defaultValue || items[0]?.value)`: reordering the tabs later keeps
   * the active tab rather than activating whichever tab is now first.
   */
  ngOnInit(): void {
    this.internalValue.set(this.defaultValue || this.items[0]?.value)
  }

  /**
   * The active tab value: the controlled `value`, else the uncontrolled one.
   * @returns The active value.
   */
  activeValue(): string | undefined {
    if (this.value !== undefined) return this.value
    return this.internalValue()
  }

  /**
   * The tab button id for a value.
   * @param value - The tab value.
   * @returns The id.
   */
  tabId(value: string): string {
    return `${this.idBase}-tab-${value}`
  }

  /**
   * The tabpanel id for a value.
   * @param value - The tab value.
   * @returns The id.
   */
  panelId(value: string): string {
    return `${this.idBase}-tabpanel-${value}`
  }

  /**
   * The tab-list class list.
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().cn(
      this.cm().tabsList({ variant: this.variant, size: this.size }),
      this.fitted && this.cm().tabsFitted,
    )
  }

  /**
   * The tab-button class list.
   * @returns The class string.
   */
  triggerClasses(): string {
    return this.cm().cn(
      this.cm().tabsTrigger({ variant: this.variant, size: this.size }),
      this.fitted && this.cm().tabTriggerFitted,
    )
  }

  /**
   * The tabpanel class list.
   * @returns The class string.
   */
  contentClasses(): string {
    return this.cm().tabsContent({ variant: this.variant, size: this.size })
  }

  /**
   * Serializes the root's inline style.
   * @returns The style attribute text.
   */
  hostStyle(): string | null {
    return styleText(this.style)
  }

  /**
   * Narrows a node-valued prop to a TemplateRef.
   *
   * @param value - The prop value.
   * @returns The template, or null.
   */
  asTemplate(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * A plain-string node value's text.
   *
   * @param value - The prop value.
   * @returns The text, or empty.
   */
  nodeText(value: unknown): string {
    return typeof value === 'string' ? value : ''
  }

  /**
   * Whether the active tab has content (React renders no panel without it).
   * @returns True when content is given.
   */
  hasContent(): boolean {
    const active = this.items.find((item) => item.value === this.activeValue())
    return !!active?.content
  }

  /**
   * The active tab's content as a template.
   * @returns The template, or null for a plain string.
   */
  activeContent(): TemplateRef<unknown> | null {
    const active = this.items.find((item) => item.value === this.activeValue())
    return active ? this.asTemplate(active.content) : null
  }

  /**
   * The active tab's plain-string content.
   * @returns The text, or empty.
   */
  contentText(): string {
    const active = this.items.find((item) => item.value === this.activeValue())
    return this.nodeText(active?.content)
  }

  /**
   * Selects a tab and notifies the caller (React's `selectTab`).
   * @param tabValue - The tab value.
   */
  selectTab(tabValue: string): void {
    if (this.value === undefined) this.internalValue.set(tabValue)
    this.change.emit(tabValue)
  }

  /**
   * The APG keyboard model: Left/Right/Home/End move focus AND selection.
   * @param event - The key event.
   */
  handleKeyDown(event: KeyboardEvent): void {
    const enabled = this.items.filter((item) => !item.disabled)
    if (enabled.length === 0) return
    const active = this.activeValue()
    const currentIndex = enabled.findIndex((item) => item.value === active)
    let nextIndex: number
    switch (event.key) {
      case 'ArrowRight':
        nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % enabled.length
        break
      case 'ArrowLeft':
        nextIndex = currentIndex === -1 ? 0 : (currentIndex - 1 + enabled.length) % enabled.length
        break
      case 'Home':
        nextIndex = 0
        break
      case 'End':
        nextIndex = enabled.length - 1
        break
      default:
        return
    }
    event.preventDefault()
    const nextValue = enabled[nextIndex].value
    this.selectTab(nextValue)
    this.focusTab(nextValue)
  }

  /**
   * Moves focus to the tab with the given value (React's `tabRefs.focus()`).
   * @param value - The tab value.
   */
  private focusTab(value: string): void {
    const match = this.tabButtons?.find((ref) => ref.nativeElement.id === this.tabId(value))
    match?.nativeElement.focus()
  }
}
