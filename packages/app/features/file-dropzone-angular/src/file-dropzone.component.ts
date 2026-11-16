/**
 * FileDropzone component (React parity).
 *
 * @module
 */

import {
  type AfterViewInit,
  Component,
  type DoCheck,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core'

import { useTranslation } from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

/**
 * Whether a node is something a caller can see (an element, or a non-blank
 * text node).
 *
 * @param node - The DOM node.
 * @returns True when it renders anything.
 */
const hasRenderable = (node: Node): boolean =>
  node.nodeType === Node.ELEMENT_NODE ||
  (node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim().length > 0)

/**
 * FileDropzone component.
 *
 * Drag-drop + click-to-browse file upload zone. Pure UI — apps handle the
 * actual upload. Rejects files exceeding `maxSize` or not matching `accept`
 * (best-effort extension/MIME check) via `onRejected`.
 *
 * The host IS the root `<div>` (`div[mol-file-dropzone]`), matching React's
 * root exactly: `role`, `tabindex`, `data-mol-id`, the drag/click/keyboard
 * handlers, the ClassMap classes and the inline drop-surface style live on it.
 * `children` is projected content; the default copy renders only when nothing
 * is projected.
 *
 * @remarks
 * Angular projection needs the `<ng-content>` capture point mounted, so the
 * default copy renders optimistically and {@link FileDropzone} withdraws it
 * once it sees that the caller projected content (React renders one or the
 * other, never both).
 */
@Component({
  selector: 'div[mol-file-dropzone]',
  standalone: true,
  inputs: ['onFiles', 'accept', 'multiple', 'maxSize', 'onRejected', 'disabled', 'className'],
  host: {
    role: 'button',
    tabindex: '0',
    'data-mol-id': 'file-dropzone',
    '[attr.aria-disabled]': 'disabled ?? null',
    '[class]': 'classes()',
    '[style.border]': 'borderStyle()',
    '[style.border-radius]': '"12px"',
    '[style.min-height]': '"140px"',
    '[style.background]': 'dragging() ? backgroundStyle : null',
    '(dragover)': 'onDragOver($event)',
    '(dragleave)': 'onDragLeave()',
    '(drop)': 'onDrop($event)',
    '(click)': 'onClick()',
    '(keydown)': 'onKeyDown($event)',
  },
  // prettier-ignore
  template: `<input #fileInput type="file" [attr.accept]="accept ?? null" [attr.multiple]="multiple ? '' : null" [attr.disabled]="disabled ? '' : null" (change)="onInputChange($event)" style="display: none" /><ng-content></ng-content>@if (!childrenProjected()) {<p #defaultDropHere [class]="dropHereClasses()">{{ dropHereText() }}</p>@if (accept) {<p #defaultAccepts [class]="acceptsClasses()">{{ acceptsText() }}</p>}}`,
})
export class FileDropzone implements AfterViewInit, DoCheck {
  /** Called with the File[] the user selected or dropped. */
  onFiles?: (files: File[]) => void
  /** Accept attribute (e.g. `'image/*'` or `'.pdf,.docx'`). */
  accept?: string
  /** Allow multi-file selection. Defaults to false. */
  multiple?: boolean
  /** Max file size in bytes. Files exceeding are rejected. */
  maxSize?: number
  /** Called with rejected files (wrong type or size). */
  onRejected?: (files: File[]) => void
  /** Disabled state. */
  disabled?: boolean
  /** Extra classes on the dropzone wrapper. */
  className?: string

  /** The hidden file input (opened by a click or Enter/Space on the zone). */
  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>
  /** The default "drop here" paragraph, while it renders. */
  @ViewChild('defaultDropHere') private defaultDropHere?: ElementRef<HTMLParagraphElement>
  /** The default accept-hint paragraph, while it renders. */
  @ViewChild('defaultAccepts') private defaultAccepts?: ElementRef<HTMLParagraphElement>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()
  /** The host element (the root `<div>`). */
  private readonly el = inject(ElementRef)
  /** Whether a drag is over the zone (React's `useState`). */
  private readonly dragging = signal(false)
  /** Whether the caller projected content (React's `children`). */
  private readonly projected = signal(false)
  /** Whether the view (and its template nodes / queries) exists yet. */
  private viewReady = false

  /** The drag-over fill, a theme token mixed into transparency. */
  readonly backgroundStyle = 'color-mix(in srgb, var(--mol-color-primary, #3366ff) 6%, transparent)'

  /**
   * The current class map.
   * @returns The UIClassMap.
   */
  cm(): UIClassMap {
    return getClassMap()
  }

  /**
   * The wrapper class list (React's `cm.cn(cm.flex({…}), cm.sp('p', 6),
   * cm.textCenter, !disabled ? cm.cursorPointer : undefined, className)`).
   * @returns The class string.
   */
  classes(): string {
    return this.cm().cn(
      this.cm().flex({ direction: 'col', align: 'center', justify: 'center' }),
      this.cm().sp('p', 6),
      this.cm().textCenter,
      !this.disabled ? this.cm().cursorPointer : undefined,
      this.className,
    )
  }

  /**
   * The dashed drop-surface border (React's `border`), thick in the primary
   * colour while a drag is over the zone and muted otherwise.
   * @returns The border declaration value.
   */
  borderStyle(): string {
    return this.dragging()
      ? '2px dashed var(--mol-color-primary, #3366ff)'
      : '2px dashed var(--mol-color-border, rgba(128,128,128,0.35))'
  }

  /**
   * The default "drop here" paragraph's class (React's
   * `cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))`).
   * @returns The class string.
   */
  dropHereClasses(): string {
    return this.cm().cn(this.cm().textSize('sm'), this.cm().fontWeight('semibold'))
  }

  /**
   * The accept-hint paragraph's class (React's
   * `cm.cn(cm.textSize('xs'), cm.sp('mt', 1))`).
   * @returns The class string.
   */
  acceptsClasses(): string {
    return this.cm().cn(this.cm().textSize('xs'), this.cm().sp('mt', 1))
  }

  /**
   * The default copy's first line (React's `fileDropzone.dropHere`).
   * @returns The translated text.
   */
  dropHereText(): string {
    return this.i18n.t(
      'fileDropzone.dropHere',
      {},
      { defaultValue: 'Drop files here or click to browse' },
    )
  }

  /**
   * The accept hint (React's `fileDropzone.accepts`). The text only renders
   * while `accept` is set (the template's `@if`), so `''` never shows.
   * @returns The translated text.
   */
  acceptsText(): string {
    return this.i18n.t(
      'fileDropzone.accepts',
      { accept: this.accept ?? '' },
      { defaultValue: 'Accepts: {{accept}}' },
    )
  }

  /**
   * Whether the default copy is withdrawn because the caller projected
   * content.
   * @returns True when projected content replaces the default copy.
   */
  childrenProjected(): boolean {
    return this.projected()
  }

  /**
   * Filters a file list into kept and rejected files, exactly as React does: a
   * file over `maxSize` is rejected, then a file matching neither the accept
   * extension nor the accept MIME token is rejected (`'*'` accepts everything).
   *
   * @param raw - The files the user dropped or picked.
   * @returns The kept and rejected files.
   */
  filter(raw: FileList | File[]): { kept: File[]; rejected: File[] } {
    const arr = Array.from(raw)
    const kept: File[] = []
    const rejected: File[] = []
    for (const f of arr) {
      if (this.maxSize && f.size > this.maxSize) {
        rejected.push(f)
        continue
      }
      // cheap accept check
      if (this.accept) {
        const okByExt = this.accept
          .split(',')
          .some(
            (a) =>
              a.trim() && f.name.toLowerCase().endsWith(a.trim().toLowerCase().replace(/^\./, '.')),
          )
        const okByMime = this.accept
          .split(',')
          .some(
            (a) =>
              a.trim() &&
              f.type &&
              (f.type === a.trim() ||
                (a.trim().endsWith('/*') && f.type.startsWith(a.trim().replace('/*', '/')))),
          )
        if (!okByExt && !okByMime && this.accept !== '*') {
          rejected.push(f)
          continue
        }
      }
      kept.push(f)
    }
    return { kept, rejected }
  }

  /**
   * Filters the given file list and dispatches kept/rejected files to the
   * callbacks — only the first kept file unless `multiple` is set.
   *
   * @param list - The files from the drop or the hidden input.
   */
  dispatch(list: FileList | File[]): void {
    const { kept, rejected } = this.filter(list)
    if (kept.length > 0) this.onFiles?.(this.multiple ? kept : [kept[0]!])
    if (rejected.length > 0) this.onRejected?.(rejected)
  }

  /** Opens the native file dialog through the hidden input. */
  openDialog(): void {
    this.fileInput?.nativeElement.click()
  }

  /**
   * React's `onDragOver`: prevents the browser's default (which would open the
   * dropped file) and highlights the zone, unless disabled.
   *
   * @param event - The native drag event.
   */
  onDragOver(event: DragEvent): void {
    if (!this.disabled) {
      event.preventDefault()
      this.dragging.set(true)
    }
  }

  /** React's `onDragLeave`: clears the highlight. */
  onDragLeave(): void {
    this.dragging.set(false)
  }

  /**
   * React's `onDrop`: always prevents the browser's default, clears the
   * highlight, and dispatches the dropped files unless disabled.
   *
   * @param event - The native drop event.
   */
  onDrop(event: DragEvent): void {
    event.preventDefault()
    this.dragging.set(false)
    if (!this.disabled && event.dataTransfer?.files) this.dispatch(event.dataTransfer.files)
  }

  /** React's `onClick`: opens the file dialog unless disabled. */
  onClick(): void {
    if (!this.disabled) this.openDialog()
  }

  /**
   * React's `onKeyDown`: `role="button"` gets no native keyboard activation —
   * Enter/Space open the file dialog and prevent their defaults (Space would
   * otherwise scroll the page).
   *
   * @param event - The native keyboard event.
   */
  onKeyDown(event: KeyboardEvent): void {
    if (this.disabled) return
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      event.preventDefault()
      this.openDialog()
    }
  }

  /**
   * React's hidden input `onChange`: dispatches the picked files.
   *
   * @param event - The native change event.
   */
  onInputChange(event: Event): void {
    const files = (event.target as HTMLInputElement).files
    if (files) this.dispatch(files)
  }

  /**
   * Whether the caller projected any content (React's `children ?? default`).
   * Latching: children cannot change after mount, so the first answer stands —
   * without the latch, withdrawing the default copy would leave no node to
   * compare against and the answer would oscillate.
   *
   * Runs only once the view is initialized: an earlier `ngDoCheck` runs before
   * the template's nodes and the view queries exist, so every node would look
   * like the caller's projection.
   */
  syncProjection(): void {
    if (!this.viewReady || this.projected()) return
    const host = this.el.nativeElement as HTMLElement
    const own = new Set<Node>()
    if (this.fileInput) own.add(this.fileInput.nativeElement)
    if (this.defaultDropHere) own.add(this.defaultDropHere.nativeElement)
    if (this.defaultAccepts) own.add(this.defaultAccepts.nativeElement)
    const projected = Array.from(host.childNodes).some(
      (node) => !own.has(node) && hasRenderable(node),
    )
    if (projected) this.projected.set(true)
  }

  /** Reads the first render's projection once the view (and its content) exist. */
  ngAfterViewInit(): void {
    this.viewReady = true
    this.syncProjection()
  }

  /** Re-reconciles the default copy with the projection after input writes. */
  ngDoCheck(): void {
    this.syncProjection()
  }
}
