/**
 * FileDropzone component (React parity).
 *
 * @module
 */

import { Component, type ElementRef, signal, ViewChild } from '@angular/core'

import {
  MolPlacement,
  placeContentBefore,
  setElementPresent,
  usePlacement,
  useTranslation,
} from '@molecule/app-angular'
import type { UIClassMap } from '@molecule/app-ui'
import { getClassMap } from '@molecule/app-ui'

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
 * projected content's capture span stays in the template and its content
 * renders in the span's place; the default copy renders only while nothing is
 * projected, and comes back when projected content is taken away.
 */
@Component({
  selector: 'div[mol-file-dropzone]',
  standalone: true,
  hostDirectives: [MolPlacement],
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
  template: `<input #fileInput type="file" [attr.accept]="accept ?? null" [attr.multiple]="multiple ? '' : null" [attr.disabled]="disabled ? '' : null" (change)="onInputChange($event)" style="display: none" /><span #contentSlot><ng-content></ng-content></span>@if (defaultCopyShown()) {<p [class]="dropHereClasses()">{{ dropHereText() }}</p>@if (accept) {<p [class]="acceptsClasses()">{{ acceptsText() }}</p>}}`,
})
export class FileDropzone {
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
  /** The projected-content capture (its span never renders; `placeContentBefore` stands in its place). */
  @ViewChild('contentSlot', { static: true }) private contentSlot?: ElementRef<HTMLSpanElement>

  /** The i18n handle (locale-reactive), read in an injection context. */
  private readonly i18n = useTranslation()
  /** Whether a drag is over the zone (React's `useState`). */
  private readonly dragging = signal(false)
  /** Whether the default copy renders (React's `children ?? default`). */
  readonly defaultCopyShown = signal(true)

  /**
   * Renders the projected content in the capture's place and withdraws the
   * capture, then shows the default copy only while nothing is projected, as
   * React's `children ?? default` does — re-decided whenever the content
   * changes (children taken away and given back included).
   */
  constructor() {
    usePlacement((hasContent) => {
      const slot = this.contentSlot?.nativeElement
      placeContentBefore(slot, slot)
      setElementPresent(slot, false)
      this.defaultCopyShown.set(!(slot ? hasContent(slot) : false))
    })
  }

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
}
