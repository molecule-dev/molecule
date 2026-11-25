/**
 * AdminTableRowActions component (React parity).
 *
 * @module
 */

import { NgTemplateOutlet } from '@angular/common'
import {
  Component,
  ElementRef,
  inject,
  type OnDestroy,
  type OnInit,
  signal,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'
import { asTemplate, nodeText } from '@molecule/app-ui-angular'

import type { AdminTableRowAction } from './types.js'

/**
 * Kebab-menu row actions.
 *
 * Angular counterpart of `@molecule/app-admin-table-react`'s
 * `AdminTableRowActions` — the same props (React names), the same ClassMap
 * tokens, and the same DOM for the same input. The host IS the wrapper
 * `<div>` (`div[mol-admin-table-row-actions]`). Dismisses on an outside click
 * or Escape (from wherever focus sits); every item is a native button/link, so
 * the whole menu is keyboard-operable.
 *
 * A menu entry's `label` arrives as a `TemplateRef` (rendered with
 * `ngTemplateOutlet`) or as text.
 */
@Component({
  selector: 'div[mol-admin-table-row-actions]',
  standalone: true,
  imports: [NgTemplateOutlet],
  inputs: ['row', 'actions', 'ariaLabel', 'stopActionPropagation'],
  host: {
    '[class]': 'classes()',
  },
  // prettier-ignore
  template: `<button type="button" [class]="triggerClasses()" aria-busy="false" [attr.aria-label]="resolvedAriaLabel()" aria-haspopup="menu" [attr.aria-expanded]="isOpen() ? 'true' : 'false'" data-mol-id="admin-table-row-actions-trigger" (click)="toggle($event)"><span [class]="iconClasses()" aria-hidden="true" data-icon="more_vert">more_vert</span></button>@if (isOpen()) {<div #popover [class]="popoverClasses()" [style]="popoverStyleText()"><div [class]="wrapperClasses()">@for (action of actions; track $index) {@if (hrefFor(action); as href) {<a [attr.href]="href" [class]="itemClasses(action)" [attr.data-mol-id]="dataMolIdFor(action)" (click)="close($event)">@if (isText(action.label)) { {{ labelText(action) }} } @else {<ng-container [ngTemplateOutlet]="labelTemplate(action)"></ng-container>}</a>} @else {<button [class]="itemClasses(action)" [attr.data-mol-id]="dataMolIdFor(action)" (click)="activate(action, $event)">@if (isText(action.label)) { {{ labelText(action) }} } @else {<ng-container [ngTemplateOutlet]="labelTemplate(action)"></ng-container>}</button>}}</div></div>}`,
})
export class AdminTableRowActions<T = unknown> implements OnInit, OnDestroy {
  /** The row the menu belongs to. */
  row?: T
  /** Menu entries. */
  actions: AdminTableRowAction<T>[] = []
  /**
   * Accessible label for the trigger button. Overrides the translated default
   * (`adminTable.aria.rowActions`, English `'Row actions'`).
   */
  ariaLabel?: string
  /** Keep selection within a clickable row. */
  stopActionPropagation = false

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()

  /** The popover element, for React's containment check. */
  @ViewChild('popover') private popover?: ElementRef<HTMLDivElement>

  /** The host element (React's root `<div>`). */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)

  /** Whether the popover menu is open. */
  private readonly open = signal(false)

  /**
   * Attaches the document listeners React adds while the menu is open.
   */
  ngOnInit(): void {
    document.addEventListener('click', this.onDocumentClick)
    document.addEventListener('keydown', this.onDocumentKeydown)
  }

  /**
   * Removes the document listeners.
   */
  ngOnDestroy(): void {
    document.removeEventListener('click', this.onDocumentClick)
    document.removeEventListener('keydown', this.onDocumentKeydown)
  }

  /**
   * Closes the menu for a click outside the popover (React's containment
   * check); clicks on the menu surface or between items stay put.
   * @param event - The document click.
   */
  private readonly onDocumentClick = (event: MouseEvent): void => {
    if (!this.open()) return
    const popover = this.popover?.nativeElement
    const target = event.target
    if (popover && target instanceof Node && popover.contains(target)) return
    this.open.set(false)
  }

  /**
   * Closes the menu on Escape, from wherever focus sits.
   * @param event - The document keydown.
   */
  private readonly onDocumentKeydown = (event: KeyboardEvent): void => {
    if (this.open() && event.key === 'Escape') this.open.set(false)
  }

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The host wrapper's class list (React's `cn(position('relative'))`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'))
  }

  /**
   * The trigger's accessible label: the `ariaLabel` input when given, else the
   * translated default (React's `ariaLabel ?? t(…)`). Read from the template,
   * so the binding follows a locale switch the way React's re-render does.
   * @returns The label.
   */
  resolvedAriaLabel(): string {
    return (
      this.ariaLabel ??
      this.i18n.t('adminTable.aria.rowActions', undefined, { defaultValue: 'Row actions' })
    )
  }

  /**
   * The kebab glyph's class list.
   * @returns The class string.
   */
  iconClasses(): string {
    return this.cm().cn(this.cm().iconGlyphFont)
  }

  /**
   * The kebab trigger's class list. The shared ghost icon button renders
   * `cm.button({ variant: 'ghost', color: 'primary', size: 'icon', fullWidth: false })`;
   * it is written out here rather than through `@molecule/app-ui-angular`'s
   * Button because that component's `size` input is typed `Size`, which omits
   * `'icon'` (the core `ButtonSize` includes it), so `[size]="'icon'"`
   * fails template type-checking.
   * @returns The class string.
   */
  triggerClasses(): string {
    return this.cm().cn(
      this.cm().button({ variant: 'ghost', color: 'primary', size: 'icon', fullWidth: false }),
    )
  }

  /**
   * The popover's class list (`surface` + `borderAll`).
   * @returns The class string.
   */
  popoverClasses(): string {
    return this.cm().cn(this.cm().surface, this.cm().borderAll)
  }

  /**
   * The popover's inline style, exactly as React writes it.
   * @returns The `style` attribute text.
   */
  popoverStyleText(): string {
    return 'position: absolute; top: 100%; right: 0px; margin-top: 4px; min-width: 160px; z-index: 20; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12)'
  }

  /**
   * The item wrapper's class list (`py-1`).
   * @returns The class string.
   */
  wrapperClasses(): string {
    return this.cm().cn(this.cm().sp('py', 1))
  }

  /**
   * Whether the popover is open.
   * @returns The open state.
   */
  isOpen(): boolean {
    return this.open()
  }

  /**
   * Toggles the menu (React's trigger `onClick`, which stops the click from
   * reaching the document listener).
   * @param event - The trigger click.
   */
  toggle(event: MouseEvent): void {
    event.stopPropagation()
    this.open.update((value) => !value)
  }

  /**
   * Closes the menu (an item's click).
   */
  close(event?: MouseEvent): void {
    if (this.stopActionPropagation) event?.stopPropagation()
    this.open.set(false)
  }

  /**
   * A button item's click: close the menu, then run the action (React's async
   * handler).
   * @param action - The action.
   */
  async activate(action: AdminTableRowAction<T>, event?: MouseEvent): Promise<void> {
    if (this.stopActionPropagation) event?.stopPropagation()
    this.open.set(false)
    await action.onSelect(this.row as T)
  }

  /**
   * One menu item's class list (React's `cn(...)` for an item).
   * @param action - The action.
   * @returns The class string.
   */
  itemClasses(action: AdminTableRowAction<T>): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center' }),
      this.cm().w('full'),
      this.cm().sp('px', 4),
      this.cm().sp('py', 2),
      this.cm().textSize('sm'),
      this.cm().cursorPointer,
      // Theme-aware hover surface.
      this.cm().tableRowHoverable,
      // Destructive → theme error color + weight.
      action.destructive ? this.cm().textError : '',
      action.destructive ? this.cm().fontWeight('semibold') : '',
    )
  }

  /**
   * An action's href for this row (React's `action.hrefFor?.(row)`).
   * @param action - The action.
   * @returns The href, or `''` when it is not a link.
   */
  hrefFor(action: AdminTableRowAction<T>): string {
    return action.hrefFor?.(this.row as T) ?? ''
  }

  /**
   * An action's `data-mol-id` for this row (absent when not given).
   * @param action - The action.
   * @returns The selector value, or null.
   */
  dataMolIdFor(action: AdminTableRowAction<T>): string | null {
    return action.dataMolIdFor?.(this.row as T) ?? null
  }

  /**
   * Whether a label is text (React renders strings and numbers as text).
   * @param value - The label.
   * @returns True when it renders as text.
   */
  isText(value: unknown): value is string | number {
    return typeof value === 'string' || typeof value === 'number'
  }

  /**
   * An action's label text.
   * @param action - The action.
   * @returns The text, or `''` for a node label.
   */
  labelText(action: AdminTableRowAction<T>): string {
    return nodeText(action.label)
  }

  /**
   * An action's label template.
   * @param action - The action.
   * @returns The template, or null for text.
   */
  labelTemplate(action: AdminTableRowAction<T>): TemplateRef<unknown> | null {
    return asTemplate(action.label)
  }
}
