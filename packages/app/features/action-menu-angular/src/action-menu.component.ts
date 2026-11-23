/**
 * ActionMenu component (React parity).
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
  TemplateRef,
  ViewChild,
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
import { Button } from '@molecule/app-ui-angular'

import type { ActionMenuItem } from './types.js'

/**
 * ActionMenu component.
 *
 * Compact overflow / kebab menu button that opens a popover list of actions on
 * click. The host IS the React root `<span>` (`span[mol-action-menu]`), carrying
 * React's `relative` class, the caller's `className` and its
 * `display: inline-block` style. Closes on outside-click and Escape. Pure
 * uncontrolled — the component manages its own open state.
 *
 * Node-valued content has no input to travel through in Angular: a `trigger`
 * template reference is accepted as the input, and `[slot=trigger]` projection
 * is rendered inside the trigger button where React puts it
 * ({@link placeContent}); an item's `label`/`icon` arrive as `ng-template`
 * references and render through `NgTemplateOutlet`. The default `⋮` glyph
 * renders as a bare text node, as in React.
 */
@Component({
  selector: 'span[mol-action-menu]',
  standalone: true,
  hostDirectives: [MolPlacement],
  imports: [Button, NgTemplateOutlet],
  inputs: ['items', 'trigger', 'align', 'triggerAriaLabel', 'className'],
  host: {
    '[class]': 'classes()',
    style: 'display: inline-block',
  },
  // prettier-ignore
  template: `<span #triggerCapture style="display: none"><ng-content select="[slot=trigger]"></ng-content></span><button #triggerButton mol-button [variant]="'ghost'" [size]="'sm'" (click)="toggle()" [attr.aria-label]="triggerLabel()" aria-haspopup="menu" [attr.aria-expanded]="isOpen() ? 'true' : 'false'" data-mol-id="action-menu-trigger">@if (triggerTemplate(); as triggerTpl) {<ng-container [ngTemplateOutlet]="triggerTpl"></ng-container>}@if (hasTextTrigger()) {<ng-container>{{ trigger }}</ng-container>}<span #defaultTrigger>⋮</span></button>@if (isOpen()) {<ul role="menu" data-mol-id="action-menu-list" [class]="listClasses()" [style]="listStyleText()">@for (item of items; track item.id) {<li role="none">@if (item.href) {<a [attr.href]="item.href" role="menuitem" [attr.data-mol-id]="itemDomId(item)" (click)="close()" [class]="anchorClasses(item)" [style.opacity]="item.disabled ? 0.5 : 1">@if (item.icon != null) {@if (isText(item.icon)) {<ng-container>{{ item.icon }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(item.icon)"></ng-container>}}<span>@if (isText(item.label)) {<ng-container>{{ item.label }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(item.label)"></ng-container>}</span></a>} @else {<button type="button" role="menuitem" [attr.data-mol-id]="itemDomId(item)" (click)="activate(item)" [disabled]="!!item.disabled" [class]="buttonClasses(item)">@if (item.icon != null) {@if (isText(item.icon)) {<ng-container>{{ item.icon }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(item.icon)"></ng-container>}}<span>@if (isText(item.label)) {<ng-container>{{ item.label }}</ng-container>}@else {<ng-container [ngTemplateOutlet]="templateOf(item.label)"></ng-container>}</span></button>}@if (item.divider) {<span aria-hidden="true" [class]="dividerClasses()" style="height: 1px; margin: 4px 0px"></span>}</li>}</ul>}`,
})
export class ActionMenu implements OnInit, OnDestroy {
  /** Items to render (required, as in React's props). */
  items: ActionMenuItem[] = []
  /** Trigger content: a template reference, or projected `[slot=trigger]` content. */
  trigger?: unknown
  /** Menu alignment relative to the trigger (defaults to `'right'` at read time). */
  align?: 'left' | 'right'
  /**
   * Accessible label for the trigger button. Overrides the translated /
   * `defaultValue` `'Actions'` (prop > `t()` > default).
   */
  triggerAriaLabel?: string
  /** Extra classes on the outer wrapper. */
  className?: string

  /** The hidden capture point for projected trigger content. */
  @ViewChild('triggerCapture') private triggerCapture?: ElementRef<HTMLSpanElement>
  /** The trigger button (the element the trigger content renders in). */
  @ViewChild('triggerButton', { read: ElementRef })
  private triggerButton?: ElementRef<HTMLButtonElement>
  /** The default `⋮` glyph's wrapper (rendered bare, or absent when a trigger exists). */
  @ViewChild('defaultTrigger') private defaultTrigger?: ElementRef<HTMLSpanElement>

  /** The host element (the React root `<span>`). */
  private readonly el = inject(ElementRef)

  /** The i18n binding the translated trigger label reads through. */
  private readonly i18n = useTranslation()

  /** Whether the popover list is open. */
  private readonly open = signal(false)

  constructor() {
    usePlacement((hasContent) => this.reconcile(hasContent))
  }

  /**
   * Attaches the document listeners React adds while the menu is open.
   */
  ngOnInit(): void {
    document.addEventListener('mousedown', this.onDoc)
    document.addEventListener('keydown', this.onEsc)
  }

  /**
   * Removes the document listeners.
   */
  ngOnDestroy(): void {
    document.removeEventListener('mousedown', this.onDoc)
    document.removeEventListener('keydown', this.onEsc)
  }

  /**
   * Closes the menu when a mousedown occurs outside the wrapper element (React's
   * outside-click effect, which only exists while the menu is open).
   * @param event - The document mousedown.
   */
  private readonly onDoc = (event: MouseEvent): void => {
    if (!this.open()) return
    if ((this.el.nativeElement as HTMLElement).contains(event.target as Node)) return
    this.open.set(false)
  }

  /**
   * Closes the menu when the Escape key is pressed.
   * @param event - The document keydown.
   */
  private readonly onEsc = (event: KeyboardEvent): void => {
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
   * Whether the popover list is open.
   * @returns The open state.
   */
  isOpen(): boolean {
    return this.open()
  }

  /**
   * Toggles the popover list (React's trigger `onClick`).
   */
  toggle(): void {
    this.open.update((value) => !value)
  }

  /**
   * The trigger's label (prop > `t()` > default), read in the template so a
   * locale switch re-renders it.
   * @returns The label text.
   */
  triggerLabel(): string {
    return (
      this.triggerAriaLabel ??
      this.i18n.t('actionMenu.aria.trigger', undefined, { defaultValue: 'Actions' })
    )
  }

  /**
   * Closes the popover list.
   */
  close(): void {
    this.open.set(false)
  }

  /**
   * A button item's click: call the handler unless disabled, then close.
   * @param item - The clicked item.
   */
  activate(item: ActionMenuItem): void {
    if (item.disabled) return
    item.onClick?.()
    this.open.set(false)
  }

  /**
   * Computes the wrapper class list (React's `cn(position('relative'), className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.cm().position('relative'), this.className)
  }

  /**
   * Computes the popover list's class list.
   * @returns The class string.
   */
  listClasses(): string {
    return this.cm().cn(
      this.cm().stack(0 as const),
      this.cm().sp('p', 1),
      this.cm().surface,
      this.cm().borderAll,
    )
  }

  /**
   * The popover list's inline style, exactly as React writes it (`right`/`left`
   * follows `align`, and React serializes `0` as `0px`).
   * @returns The `style` attribute text.
   */
  listStyleText(): string {
    const side = (this.align ?? 'right') === 'right' ? 'right' : 'left'
    return `position: absolute; top: 100%; ${side}: 0px; min-width: 160px; z-index: 50; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.12)`
  }

  /**
   * Computes a button item's class list (React's button branch).
   * @param item - The item.
   * @returns The class string.
   */
  buttonClasses(item: ActionMenuItem): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().w('full'),
      this.cm().sp('px', 2),
      this.cm().sp('py', 2),
      this.cm().textSize('sm'),
      item.destructive && this.cm().textError,
      item.destructive ? this.cm().fontWeight('semibold') : this.cm().fontWeight('medium'),
    )
  }

  /**
   * Computes an anchor item's class list (React's anchor branch, which has no
   * `w('full')`).
   * @param item - The item.
   * @returns The class string.
   */
  anchorClasses(item: ActionMenuItem): string {
    return this.cm().cn(
      this.cm().flex({ align: 'center', gap: 'sm' }),
      this.cm().sp('px', 2),
      this.cm().sp('py', 2),
      this.cm().textSize('sm'),
      item.destructive && this.cm().textError,
      item.destructive ? this.cm().fontWeight('semibold') : this.cm().fontWeight('medium'),
    )
  }

  /**
   * Computes the divider's class list.
   * @returns The class string.
   */
  dividerClasses(): string {
    return this.cm().cn(this.cm().displayBlock, this.cm().bgBorder)
  }

  /**
   * The `data-mol-id` of one item (`action-menu-item-<id>`).
   * @param item - The item.
   * @returns The selector value.
   */
  itemDomId(item: ActionMenuItem): string {
    return `action-menu-item-${item.id}`
  }

  /**
   * Whether a field holds text (React renders strings and numbers as text).
   * @param value - A label or icon.
   * @returns True when it renders as text.
   */
  isText(value: unknown): value is string | number {
    return typeof value === 'string' || typeof value === 'number'
  }

  /**
   * Narrows a value to an embedded template.
   * @param value - A label or icon.
   * @returns The template, or null.
   */
  templateOf(value: unknown): TemplateRef<unknown> | null {
    return value instanceof TemplateRef ? value : null
  }

  /**
   * The trigger as a template reference (a node passed as the input rather than
   * projected).
   * @returns The trigger template, or null.
   */
  triggerTemplate(): TemplateRef<unknown> | null {
    return this.templateOf(this.trigger)
  }

  /**
   * Whether the trigger is a non-empty text input.
   * @returns True when the trigger renders as text.
   */
  hasTextTrigger(): boolean {
    return typeof this.trigger === 'string' && this.trigger !== ''
  }

  /**
   * Places the trigger content where React renders it: the projected
   * `[slot=trigger]` nodes move into the button (React renders them as its bare
   * child), the hidden capture point leaves the DOM, and the default `⋮` becomes
   * a bare text node — or drops out when a trigger exists.
   *
   * @param hasContent - Reads whether a slot has content.
   */
  private reconcile(hasContent: SlotReader): void {
    const capture = this.triggerCapture?.nativeElement
    const button = this.triggerButton?.nativeElement
    const glyph = this.defaultTrigger?.nativeElement
    const hasTrigger =
      hasContent(capture) || this.triggerTemplate() !== null || this.hasTextTrigger()

    if (capture && button) {
      if (hasContent(capture)) placeContent(capture, button)
      setElementPresent(capture, false)
    }

    // The glyph is React's `⋮` fallback: a bare text node, present only while no
    // trigger is supplied.
    if (glyph && button) {
      if (hasTrigger) placeContent(glyph, null)
      else placeContent(glyph, button)
      setElementPresent(glyph, false)
    }
  }
}
