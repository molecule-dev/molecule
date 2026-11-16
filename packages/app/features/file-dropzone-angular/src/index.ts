/**
 * Angular file dropzone — drag-drop + click-to-browse file picker with
 * accept / max-size filtering. Pure UI: it emits the chosen `File[]`
 * and the host app performs the actual upload.
 *
 * Exports `<FileDropzone>` and its `FileDropzoneProps`. It is the Angular
 * counterpart of `@molecule/app-file-dropzone-react`: same props and the same
 * DOM for the same input.
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { FileDropzone } from '@molecule/app-file-dropzone-angular'
 *
 * @Component({
 *   selector: 'app-avatar-upload',
 *   standalone: true,
 *   imports: [FileDropzone],
 *   template: `
 *     <div
 *       mol-file-dropzone
 *       accept="image/*"
 *       [maxSize]="5 * 1024 * 1024"
 *       [onFiles]="uploadAvatar"
 *       [onRejected]="showError"
 *     ></div>
 *   `,
 * })
 * export class AvatarUpload {
 *   avatar: File | null = null
 *   error = ''
 *   uploadAvatar = (files: File[]): void => {
 *     this.avatar = files[0] ?? null
 *   }
 *   showError = (files: File[]): void => {
 *     this.error = `${files.length} file(s) are not images under 5 MB`
 *   }
 * }
 * ```
 *
 * @remarks
 * With `multiple` false (the default) only the FIRST accepted file is
 * delivered to `onFiles`, even when the user drops several at once.
 *
 * The `accept` filter is a best-effort client-side check (file
 * extension or MIME prefix match) — treat it as UX sugar and always
 * re-validate on the server. Files failing `accept` or `maxSize` go to
 * `onRejected` (both rejection causes arrive in the same callback).
 *
 * `children` is projected content (Angular cannot carry a node in an input):
 * put it between the element's tags to replace the default "Drop files here or
 * click to browse" copy, which translates via
 * `@molecule/app-locales-file-dropzone`.
 *
 * The zone is a keyboard-activatable `role="button"` (`tabindex="0"`):
 * pressing Enter or Space opens the native file dialog, matching a click.
 *
 * @module
 */

export * from './file-dropzone.component.js'
export * from './types.js'
