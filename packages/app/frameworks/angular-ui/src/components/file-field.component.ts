/**
 * A browser file picker and drop target.
 *
 * @module
 */

import {
  booleanAttribute,
  Component,
  type ElementRef,
  EventEmitter,
  Input,
  Output,
  ViewChild,
} from '@angular/core'

import { createBrowserFileInput, fromBrowserFile, type PickedFile } from '@molecule/app-filesystem'
import type { FileFieldHandle, FileFieldProps } from '@molecule/app-ui'

/** Renders one focusable target and emits portable file selections. */
@Component({
  selector: 'div[mol-file-field]',
  standalone: true,
  host: {
    'data-mol-id': 'file-field',
    '[attr.role]': 'role ?? "button"',
    '[class]': 'className',
    '[attr.tabindex]': 'disabled ? -1 : 0',
    '[attr.aria-disabled]': 'disabled ?? null',
    '(click)': 'handlers.onClick($event)',
    '(keydown)': 'handlers.onKeyDown($event)',
    '(dragover)': 'onDragOver($event)',
    '(drop)': 'handlers.onDrop($event)',
  },
  template: `<input
      #fileInput
      type="file"
      hidden
      [attr.accept]="accept ?? null"
      [multiple]="multiple"
      [disabled]="disabled ?? false"
      (change)="handlers.onChange()"
    /><ng-content />`,
})
export class FileField implements FileFieldHandle {
  /** Comma-separated accepted types and extensions. */
  @Input() accept?: string
  /** ClassMap classes for the host. */
  @Input() className?: string
  /** Prevents picking and delivering files. */
  @Input() disabled?: boolean
  /** Inclusive per-file limit in bytes. */
  @Input() maxSize?: number
  /** Delivers all accepted files in selection order. */
  @Input({ transform: booleanAttribute }) multiple = false
  /** Optional accessibility role for the host. */
  @Input() role?: FileFieldProps['role']
  /** The accepted files. */
  @Output() readonly valueChange = new EventEmitter<readonly PickedFile[]>()
  /** The files rejected by type or size. */
  @Output() readonly rejected = new EventEmitter<readonly PickedFile[]>()
  /** A failure opening or reading the chooser. */
  @Output() readonly pickError = new EventEmitter<Error>()

  @ViewChild('fileInput') private fileInput?: ElementRef<HTMLInputElement>

  /** Shared DOM event handlers for this host and its input. */
  protected readonly handlers = createBrowserFileInput(
    () => this.fileInput?.nativeElement,
    () => ({
      accept: this.accept,
      disabled: this.disabled,
      maxSize: this.maxSize,
      multiple: this.multiple,
      onFiles: (files) => this.valueChange.emit(files),
      onRejected: (files) => this.rejected.emit(files),
      onPickError: (error) => this.pickError.emit(error),
    }),
    fromBrowserFile,
  )

  /** Opens the chooser when called on the field instance from a view query. */
  pick(): void {
    this.handlers.onClick({ target: null, defaultPrevented: false })
  }

  /**
   * Enables dropping on the host when the field is enabled.
   * @param event - The native drag event.
   */
  protected onDragOver(event: DragEvent): void {
    this.handlers.onDragOver(event)
  }
}
