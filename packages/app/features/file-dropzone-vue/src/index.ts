/**
 * Vue file dropzone — drag-drop + click-to-browse file picker with
 * accept / max-size filtering. Pure UI: it emits the chosen `File[]`
 * and the host app performs the actual upload.
 *
 * Exports `<FileDropzone>` and its `FileDropzoneProps`. It is the Vue
 * counterpart of `@molecule/app-file-dropzone-react`: same props and the same
 * DOM for the same input.
 *
 * @example
 * ```ts
 * import { defineComponent, h } from 'vue'
 * import { FileDropzone } from '@molecule/app-file-dropzone-vue'
 *
 * const AvatarUpload = defineComponent({
 *   setup() {
 *     return () =>
 *       h(FileDropzone, {
 *         accept: 'image/*',
 *         multiple: false,
 *         maxSize: 5 * 1024 * 1024,
 *         onFiles: (files: File[]) => uploadAvatar(files[0]),
 *         onRejected: (files: File[]) => showError(files[0].name),
 *       })
 *   },
 * })
 * ```
 *
 * @remarks
 * With `multiple={false}` (the default) only the FIRST accepted file is
 * delivered to `onFiles`, even when the user drops several at once.
 *
 * The `accept` filter is a best-effort client-side check (file
 * extension or MIME prefix match) — treat it as UX sugar and always
 * re-validate on the server. Files failing `accept` or `maxSize` go to
 * `onRejected` (both rejection causes arrive in the same callback).
 *
 * Pass `children` (or the default slot) to replace the default "Drop files
 * here or click to browse" copy; the default copy translates via
 * `@molecule/app-locales-file-dropzone`.
 *
 * The zone is a keyboard-activatable `role="button"` (`tabindex="0"`):
 * pressing Enter or Space opens the native file dialog, matching a click.
 *
 * @module
 */

export * from './FileDropzone.js'
export * from './types.js'
