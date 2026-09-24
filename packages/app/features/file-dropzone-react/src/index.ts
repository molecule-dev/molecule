/**
 * File dropzone — drag-drop + click-to-browse file picker with
 * accept / max-size filtering. Pure UI: it emits the chosen `File[]`
 * and the host app performs the actual upload.
 *
 * Exports `<FileDropzone>` and its `FileDropzoneProps`.
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { FileDropzone } from '@molecule/app-file-dropzone-react'
 * import { post } from '@molecule/app-http'
 *
 * export function AvatarUpload() {
 *   const [status, setStatus] = useState('')
 *   async function upload(files: File[]): Promise<void> {
 *     const body = new FormData()
 *     body.append('file', files[0])
 *     setStatus(`Uploading ${files[0].name}…`)
 *     await post('/uploads', body) // FormData is sent as multipart, not JSON
 *     setStatus(`Uploaded ${files[0].name}`)
 *   }
 *   return (
 *     <>
 *       <FileDropzone
 *         accept="image/*"
 *         maxSize={5 * 1024 * 1024}
 *         onFiles={(files) => void upload(files)}
 *         onRejected={(files) => setStatus(`${files.map((f) => f.name).join(', ')}: not an image under 5 MB`)}
 *       />
 *       <p role="status">{status}</p>
 *     </>
 *   )
 * }
 * ```
 *
 * @remarks
 * It does NOT upload, preview or show progress — `onFiles` just receives
 * `File` objects; send them yourself (e.g. `post(url, formData)` from
 * `@molecule/app-http`). `maxSize` is in BYTES. The hidden input is never
 * reset, so picking the SAME file twice in a row via the dialog does not
 * fire `onFiles` again.
 *
 * It calls `useTranslation()`, so it must render inside `<I18nProvider>` /
 * `<MoleculeProvider>`, and `getClassMap()` throws unless
 * `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 *
 * With `multiple={false}` (the default) only the FIRST accepted file is
 * delivered to `onFiles`, even when the user drops several at once.
 *
 * The `accept` filter is a best-effort client-side check (file
 * extension or MIME prefix match) — treat it as UX sugar and always
 * re-validate on the server. Files failing `accept` or `maxSize` go to
 * `onRejected` (both rejection causes arrive in the same callback).
 *
 * Pass `children` to replace the default "Drop files here or click to
 * browse" copy; the default copy translates via
 * `@molecule/app-locales-file-dropzone`.
 *
 * The zone is a keyboard-activatable `role="button"` (`tabIndex={0}`):
 * pressing Enter or Space opens the native file dialog, matching a click.
 *
 * @module
 */

export * from './FileDropzone.js'
