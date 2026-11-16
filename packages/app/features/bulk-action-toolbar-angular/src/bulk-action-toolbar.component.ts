/**
 * BulkActionToolbar component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  type OnDestroy,
  type TemplateRef,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { Button, styleText } from '@molecule/app-ui-angular'

import type { BulkAction } from './types.js'

/** React's sticky-bottom inline style, written to the DOM the way React writes it. */
const STICKY_BOTTOM = { position: 'sticky', bottom: 16, zIndex: 30 } as const

/** React's sticky-top inline style, written to the DOM the way React writes it. */
const STICKY_TOP = { position: 'sticky', top: 16, zIndex: 30 } as const

/**
 * BulkActionToolbar component.
 *
 * Selection-aware bulk action bar — appears when the user has selected one
 * or more rows, shows the count + a row of action buttons + a "Clear
 * selection" link. The host IS the root `<div>`
 * (`div[mol-bulk-action-toolbar]`), matching React's root exactly.
 *
 * React renders null while `count <= 0` — Angular's host element always
 * exists, so it is detached from the DOM in that state (the same approach
 * `@molecule/app-auth-ui-angular` takes for its no-providers render), and
 * restored when rows are selected again. `position` defaults to
 * `'sticky-bottom'` (16px inset, z-30); `'sticky-top'` and `'inline'` are
 * also supported. Destructive actions render as solid error-colored
 * buttons.
 *
 * React keys each action button by the action's `id`, so a re-ordered or
 * re-passed array moves/keeps the rendered buttons per key; Angular's
 * `@for` tracks the same id.
 */
@Component({
  selector: 'div[mol-bulk-action-toolbar]',
  standalone: true,
  imports: [Button, NgTemplateOutlet],
  inputs: ['count', 'actions', 'onClearSelection', 'position', 'className'],
  host: {
    role: 'region',
    '[attr.aria-label]': 'toolbarLabel()',
    '[class]': 'classes()',
    '[style]': 'inlineStyleText()',
  },
  template: `<span [class]="countClasses()">{{ selectedText() }}</span>
    <div [class]="rowClasses()">
      @for (action of actions; track action.id) {
        <button
          mol-button
          [variant]="action.destructive ? 'solid' : 'ghost'"
          [color]="action.destructive ? 'error' : 'primary'"
          [size]="'sm'"
          [disabled]="action.disabled ?? false"
          (click)="runAction(action, $event)"
        >
          @if (isTemplate(action.icon)) {
            <ng-container [ngTemplateOutlet]="action.icon" />
          }
          @if (action.label) {
            <span>
              @if (isTemplate(action.label)) {
                <ng-container [ngTemplateOutlet]="action.label" />
              } @else {
                {{ action.label }}
              }
            </span>
          }
        </button>
      }
      @if (onClearSelection) {
        <button mol-button [variant]="'ghost'" [size]="'sm'" (click)="onClearSelection($event)">
          {{ clearText() }}
        </button>
      }
    </div>`,
})
export class BulkActionToolbar implements AfterViewInit, DoCheck, OnDestroy {
  /** Selection count — the toolbar hides (the host detaches) when 0. */
  count = 0
  /** Action buttons. */
  actions: BulkAction[] = []
  /** Called when "Clear selection" is clicked. */
  onClearSelection?: (event?: MouseEvent) => void
  /** Position (`'sticky-bottom'` until an input says otherwise). */
  position?: 'sticky-bottom' | 'sticky-top' | 'inline'
  /** Extra classes. */
  className?: string

  /** The translation function, captured in the injection context. */
  private readonly i18n = useTranslation()
  /** The host element (the root `<div>`), for the null-render detach. */
  private readonly el = inject(ElementRef)
  /** Where the detached host lives, for the restore. */
  private detachedParent: Node | null = null
  /** The node the detached host is restored before. */
  private detachedAnchor: Node | null = null

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * Computes the toolbar class list (React's
   * `cm.cn(cm.flex({ align, justify, gap }), cm.sp('px', 3), cm.sp('py', 2), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', justify: 'between', gap: 'md' }),
      this.cm().sp('px', 3),
      this.cm().sp('py', 2),
      this.className,
    )
  }

  /**
   * The count text's class (`cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  countClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The action row's class (`cm.flex({ align: 'center', gap: 'sm' })`).
   * @returns The class string.
   */
  rowClasses(): string {
    return this.cm().cn(this.cm().flex({ align: 'center', gap: 'sm' }))
  }

  /**
   * The toolbar's accessible name (React's `aria-label`): prop-less `t()` with
   * the English default `'Bulk actions'`, so a locale switch re-renders it.
   * @returns The label text.
   */
  toolbarLabel(): string {
    return this.i18n.t('bulkActions.aria.toolbar', {}, { defaultValue: 'Bulk actions' })
  }

  /**
   * The translated count label (React's `t('bulkActions.selected', { count }, …)`).
   * @returns The label text.
   */
  selectedText(): string {
    return this.i18n.t(
      'bulkActions.selected',
      { count: this.count },
      { defaultValue: '{{count}} selected' },
    )
  }

  /**
   * The translated Clear label (React's `t('bulkActions.clear', {}, …)`).
   * @returns The label text.
   */
  clearText(): string {
    return this.i18n.t('bulkActions.clear', {}, { defaultValue: 'Clear' })
  }

  /**
   * The toolbar's inline style text (React's
   * `style={position === 'sticky-bottom' ? … : …}`); null when inline, so
   * no `style` attribute renders.
   * @returns The style text or null.
   */
  inlineStyleText(): string | null {
    const position = this.position ?? 'sticky-bottom'
    return position === 'sticky-bottom'
      ? styleText(STICKY_BOTTOM)
      : position === 'sticky-top'
        ? styleText(STICKY_TOP)
        : null
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
   * Runs one action's callback (React passes the click event through).
   * @param action - The action whose button was clicked.
   * @param event - The native click event.
   */
  runAction(action: BulkAction, event: MouseEvent): void {
    action.onClick(event)
  }

  /**
   * Removes the host element from the DOM while React would render null
   * (count <= 0), and restores it when rows are selected again.
   */
  syncHostVisibility(): void {
    const host = this.el.nativeElement as HTMLElement
    if (this.count <= 0) {
      if (host.isConnected) {
        this.detachedParent = host.parentNode
        this.detachedAnchor = host.nextSibling
        host.parentNode?.removeChild(host)
      }
    } else if (this.detachedParent && !host.isConnected) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }

  /**
   * Reconciles host visibility once the view is in the document: the first
   * ngDoCheck of a cycle runs before Angular has inserted a freshly created
   * view, so the mount-time decision (React renders null for count <= 0) is
   * applied here, where the host is connected and can be detached.
   */
  ngAfterViewInit(): void {
    this.syncHostVisibility()
  }

  /** Re-reconciles host visibility after input writes and resets. */
  ngDoCheck(): void {
    this.syncHostVisibility()
  }

  /** Restores the host before Angular removes it (unmount). */
  ngOnDestroy(): void {
    const host = this.el.nativeElement as HTMLElement
    // The host must be inside its parent for Angular's own removal to succeed.
    if (!host.isConnected && this.detachedParent) {
      this.detachedParent.insertBefore(host, this.detachedAnchor)
      this.detachedParent = null
      this.detachedAnchor = null
    }
  }
}
