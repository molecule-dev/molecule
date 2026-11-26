/**
 * Svelte file dropzone — drag-drop + click-to-browse file picker with
 * accept / max-size filtering. Pure UI: it emits `readonly PickedFile[]`
 * and the host app performs the actual upload.
 *
 * Exports `FileDropzone` and its `FileDropzoneProps`. It is the Svelte
 * counterpart of `@molecule/app-file-dropzone-react`: same props and the same
 * DOM for the same input.
 *
 * @example
 * ```svelte
 * <script lang="ts">
 *   import { FileDropzone } from '@molecule/app-file-dropzone-svelte'
 * </script>
 *
 * <FileDropzone
 *   accept="image/*"
 *   multiple={false}
 *   maxSize={5 * 1024 * 1024}
 *   onFiles={(files) => {
 *     const form = new FormData()
 *     files[0]?.appendTo(form, 'avatar')
 *     uploadAvatar(form)
 *   }}
 *   onRejected={(files) => showError(files[0].name)}
 * />
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
 * Pass the default content snippet to replace the default "Drop files here or
 * click to browse" copy; the default copy translates via
 * `@molecule/app-locales-file-dropzone`.
 *
 * The zone is a keyboard-activatable `role="button"` (`tabindex="0"`):
 * pressing Enter or Space opens the native file dialog, matching a click.
 *
 * @module
 */

export * from './components.js'
export * from './types.js'
