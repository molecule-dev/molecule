/**
 * AnnotationPin component (React parity).
 *
 * @module
 */

import { NgStyle, NgTemplateOutlet } from '@angular/common'
import {
  type AfterViewInit,
  Component,
  type DoCheck,
  type ElementRef,
  inject,
  type Renderer2,
  RendererFactory2,
  type TemplateRef,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

import { styleObject, styleString } from './css.js'
import { ElementToggle, hasNodes } from './slot-dom.js'

/**
 * Whether a node-valued prop is an Angular template (a rendered node) rather
 * than plain text. Checked structurally — `TemplateRef` is a type-only import
 * in the emitted metadata, so `instanceof` is not dependable across bundles.
 *
 * @param value - The prop value.
 * @returns True when it can be rendered with `ngTemplateOutlet`.
 */
const isTemplate = (value: unknown): value is TemplateRef<unknown> =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as TemplateRef<unknown>).createEmbeddedView === 'function'

/**
 * Renders a text value the way React renders a node string.
 *
 * @param value - The prop value.
 * @returns The text to render, or `null` when there is none.
 */
const textOf = (value: unknown): string | null =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : null

/**
 * A single pin marker (small circle with optional `label`) rendered at an
 * absolute position on its parent. Clicking the marker toggles its popup
 * (which shows the `note` body) via the `onClick` handler.
 *
 * The host IS the outer `<div>` (`div[mol-annotation-pin]`), matching React's
 * root exactly. Node props are an input (a string or a `TemplateRef`) or
 * projected content (`[slot=label]`, `[slot=note]`).
 *
 * This is the Angular counterpart of `@molecule/app-annotation-pin-react`.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture points mounted, and an
 * `ng-content` created later never receives the projection, so the popup and
 * the two capture points live in the template unconditionally and
 * {@link AnnotationPin.ngDoCheck} detaches the ones React would not render.
 */
@Component({
  selector: 'div[mol-annotation-pin]',
  standalone: true,
  imports: [NgStyle, NgTemplateOutlet],
  inputs: [
    'position',
    'label',
    'note',
    'selected',
    'onClick',
    'popupSide',
    'className',
    'normalised',
  ],
  host: {
    '[class]': 'classes()',
    'data-mol-id': 'annotation-pin',
    '[attr.data-pin-selected]': 'selected ? "true" : "false"',
    '[attr.style]': 'wrapperStyle()',
  },
  // prettier-ignore
  template: `<button type="button" (click)="handleMarkerClick($event)" [attr.aria-label]="markerLabel()" [attr.aria-expanded]="selected ? 'true' : 'false'" data-mol-id="annotation-pin-marker" [class]="markerClasses()" [ngStyle]="markerStyles()"><span [class]="labelClasses()" data-mol-id="annotation-pin-label" [attr.style]="labelStyle()">@if (labelTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (labelText() !== null) {{{ labelText() }}}<span #labelSlot data-parity-unwrap><ng-content select="[slot=label]"></ng-content></span></span></button><div #popupEl role="dialog" [attr.aria-label]="popupLabel()" data-mol-id="annotation-pin-popup" [attr.data-popup-side]="popupSide ?? 'right'" [class]="popupClasses()" [attr.style]="popupStyle()"><div data-mol-id="annotation-pin-popup-body">@if (noteTemplate(); as tpl) {<ng-container [ngTemplateOutlet]="tpl" />} @else if (noteText() !== null) {{{ noteText() }}}<span #noteSlot data-parity-unwrap><ng-content select="[slot=note]"></ng-content></span><span #emptyNoteEl data-mol-id="annotation-pin-popup-empty">{{ emptyNote() }}</span></div></div>`,
})
export class AnnotationPin implements AfterViewInit, DoCheck {
  /** Position in the parent surface's coordinate space (typically normalised 0..1). */
  position!: { x: number; y: number }
  /** Short label inside the marker — text, a template, or `[slot=label]` content. */
  label?: TemplateRef<unknown> | string | number | null
  /** Popup body when selected — text, a template, or `[slot=note]` content. */
  note?: TemplateRef<unknown> | string | number | null
  /** Whether the popup is rendered (React's `selected`). */
  selected?: boolean
  /** Click handler — fires when the pin marker is clicked. */
  onClick?: () => void
  /** Side the popup renders on (defaults to `'right'` at read time). */
  popupSide?: 'top' | 'bottom' | 'left' | 'right'
  /** Extra classes merged onto the root wrapper. */
  className?: string
  /** Whether positions are normalised (defaults to `true` at read time). */
  normalised?: boolean

  /** The popup element, in the template unconditionally (see the class remarks). */
  @ViewChild('popupEl') private popupEl?: ElementRef<HTMLElement>
  /** The `[slot=label]` capture point. */
  @ViewChild('labelSlot') private labelSlot?: ElementRef<HTMLElement>
  /** The `[slot=note]` capture point. */
  @ViewChild('noteSlot') private noteSlot?: ElementRef<HTMLElement>
  /** The empty-state line, rendered in the template and detached when a note is present. */
  @ViewChild('emptyNoteEl') private emptyNoteEl?: ElementRef<HTMLElement>

  /** The DOM renderer, for the attach/detach reconciliation. */
  private readonly renderer: Renderer2 = inject(RendererFactory2).createRenderer(null, null)
  /** Reconciles the popup against React's DOM. */
  private readonly popupToggle = new ElementToggle(this.renderer)
  /** Reconciles the label capture point. */
  private readonly labelToggle = new ElementToggle(this.renderer)
  /** Reconciles the note capture point. */
  private readonly noteToggle = new ElementToggle(this.renderer)
  /** Reconciles the empty-state line. */
  private readonly emptyToggle = new ElementToggle(this.renderer)
  /** Whether a `[slot=note]` projection landed. */
  private noteProjected = false
  /**
   * Reactive translation, read in the injection context. Its `t` reads the
   * locale, so the view re-renders the text on a locale switch.
   */
  private readonly i18n = useTranslation()

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper's class list (React's `cm.cn(className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(this.className)
  }

  /**
   * The marker button's class list (React's `cm.cn(cm.roundedFull, cm.cursorPointer)`).
   * @returns The class string.
   */
  markerClasses(): string {
    return this.cm().cn(this.cm().roundedFull, this.cm().cursorPointer)
  }

  /**
   * The marker label's class list (React's `cm.cn(cm.textSize('xs'), cm.fontWeight('bold'))`).
   * @returns The class string.
   */
  labelClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().fontWeight('bold'))
  }

  /**
   * The popup's class list (React's `cm.cn(cm.surface, cm.borderAll, cm.textSize('sm'))`).
   * @returns The class string.
   */
  popupClasses(): string {
    return this.cm().cn(this.cm().surface, this.cm().borderAll, this.cm().textSize('sm'))
  }

  /**
   * The wrapper's inline style (React's `wrapperStyle`).
   * @returns The serialised style attribute.
   */
  wrapperStyle(): string {
    const normalised = this.normalised ?? true
    return styleString({
      position: 'absolute',
      left: normalised ? `${this.position.x * 100}%` : `${this.position.x}px`,
      top: normalised ? `${this.position.y * 100}%` : `${this.position.y}px`,
      transform: 'translate(-50%, -50%)',
      zIndex: this.selected ? 2 : 1,
    })
  }

  /**
   * The marker button's inline style (React's `markerStyle`), as a style map
   * so the CSSOM normalises it exactly as React's own inline styles do.
   * @returns The style map.
   */
  markerStyles(): Record<string, string> {
    return styleObject({
      width: 24,
      height: 24,
      border: 'none',
      padding: 0,
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
    })
  }

  /**
   * The marker label's inline style (React's `{ lineHeight: 1, pointerEvents: 'none' }`).
   * @returns The serialised style attribute.
   */
  labelStyle(): string {
    return styleString({ lineHeight: 1, pointerEvents: 'none' })
  }

  /**
   * The popup's inline style (React's `popupStyle`, side-specific).
   * @returns The serialised style attribute.
   */
  popupStyle(): string {
    const base: Record<string, string | number> = {
      position: 'absolute',
      minWidth: 160,
      maxWidth: 240,
      padding: 8,
      borderRadius: 4,
      boxShadow: '0 4px 12px rgba(0,0,0,0.18)',
      zIndex: 3,
    }
    switch (this.popupSide ?? 'right') {
      case 'top':
        base.bottom = '100%'
        base.left = '50%'
        base.transform = 'translate(-50%, -8px)'
        break
      case 'bottom':
        base.top = '100%'
        base.left = '50%'
        base.transform = 'translate(-50%, 8px)'
        break
      case 'left':
        base.right = '100%'
        base.top = '50%'
        base.transform = 'translate(-8px, -50%)'
        break
      case 'right':
      default:
        base.left = '100%'
        base.top = '50%'
        base.transform = 'translate(8px, -50%)'
        break
    }
    return styleString(base)
  }

  /**
   * The label as a template, when the caller passed a node.
   * @returns The template, or null.
   */
  labelTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.label) ? this.label : null
  }

  /**
   * The label as text, when the caller passed one.
   * @returns The text, or null.
   */
  labelText(): string | null {
    return textOf(this.label)
  }

  /**
   * The note as a template, when the caller passed a node.
   * @returns The template, or null.
   */
  noteTemplate(): TemplateRef<unknown> | null {
    return isTemplate(this.note) ? this.note : null
  }

  /**
   * The note as text, when the caller passed one.
   * @returns The text, or null.
   */
  noteText(): string | null {
    return textOf(this.note)
  }

  /**
   * Whether a label prop was given (any value React would render, `''`
   * included).
   * @returns True when the label prop is present.
   */
  hasLabelProp(): boolean {
    return this.label !== undefined && this.label !== null
  }

  /**
   * Whether a note prop was given (any value React would render, `''` included).
   * @returns True when the note prop is present.
   */
  hasNoteProp(): boolean {
    return this.note !== undefined && this.note !== null
  }

  /**
   * Whether the popup body holds the caller's note (React's `note ?? …`):
   * a note prop of any value, or `[slot=note]` content.
   * @returns True when the note renders instead of the empty state.
   */
  hasNote(): boolean {
    return this.hasNoteProp() || this.noteProjected
  }

  /**
   * The marker button's accessible label (React's `annotationPin.aria.marker`).
   * @returns The label text.
   */
  markerLabel(): string {
    return this.i18n.t('annotationPin.aria.marker', {}, { defaultValue: 'Annotation pin' })
  }

  /**
   * The popup's accessible label (React's `annotationPin.aria.popup`).
   * @returns The label text.
   */
  popupLabel(): string {
    return this.i18n.t('annotationPin.aria.popup', {}, { defaultValue: 'Annotation details' })
  }

  /**
   * The popup's empty-state text (React's `annotationPin.empty`).
   * @returns The text.
   */
  emptyNote(): string {
    return this.i18n.t('annotationPin.empty', {}, { defaultValue: 'No notes for this pin.' })
  }

  /**
   * Stops the marker click from bubbling to arbitrary ancestor click handlers
   * and forwards it to `onClick`.
   *
   * @param event - The originating mouse event.
   */
  handleMarkerClick(event: MouseEvent): void {
    event.stopPropagation()
    this.onClick?.()
  }

  /**
   * Reads the projected capture points and reconciles the popup and the two
   * capture wrappers against what React renders.
   */
  reconcile(): void {
    const note = this.noteSlot?.nativeElement
    if (note) this.noteProjected = hasNodes(note)
    this.popupToggle.toggle(this.popupEl?.nativeElement, this.selected === true)
    this.labelToggle.toggle(this.labelSlot?.nativeElement, !this.hasLabelProp())
    this.noteToggle.toggle(note, !this.hasNoteProp())
    this.emptyToggle.toggle(this.emptyNoteEl?.nativeElement, !this.hasNote())
  }

  /** Reconciles once the view (and its projections) exist. */
  ngAfterViewInit(): void {
    this.reconcile()
  }

  /** Reconciles after input writes, as React re-renders on a prop change. */
  ngDoCheck(): void {
    this.reconcile()
  }
}
