/**
 * FilePond file upload provider for the molecule file upload interface.
 *
 * Implements `FileUploadProvider` from `@molecule/app-file-upload` using a
 * headless upload engine with validation, progress tracking, concurrency
 * control, and image preview generation following FilePond's patterns.
 *
 * @example
 * ```typescript
 * import { createUploader, setProvider } from '@molecule/app-file-upload'
 * import type { UploadFile } from '@molecule/app-file-upload'
 * import { createFilepondProvider } from '@molecule/app-file-upload-filepond'
 *
 * // Startup (bonds.ts): bond once. `timeout` is in MILLISECONDS (default 0 = none).
 * setProvider(createFilepondProvider({ timeout: 60_000 }))
 *
 * // Anywhere: one multipart POST per file to destination.url, field name 'file'.
 * const done = new Promise<UploadFile[]>((resolve) => {
 *   const uploader = createUploader({
 *     destination: {
 *       url: '/api/uploads',
 *       additionalData: { folder: 'avatars' },
 *       parseResponse: (response) => (response as { id: string }).id, // → file.result
 *     },
 *     validation: { maxSize: 5 * 1024 * 1024, acceptedTypes: ['image/*'] },
 *     events: {
 *       onValidationError: (file, errors) => console.warn(file.name, errors),
 *       onError: (file, error) => console.error(file.name, error),
 *       onAllComplete: resolve,
 *     },
 *   })
 *   // From <input type="file"> or a drop event: Array.from(input.files ?? [])
 *   uploader.addFiles([new File([new Uint8Array(2048)], 'me.png', { type: 'image/png' })])
 *   uploader.upload() // autoUpload defaults to false
 * })
 *
 * const [avatar] = await done
 * console.log(avatar?.status, avatar?.result) // 'complete', the id your server returned
 * ```
 *
 * @remarks
 * The factory is `createFilepondProvider(config)` (or the ready-made `provider`
 * export) — there is NO `createProvider`, and this package does NOT load the
 * FilePond UI library or render a drop zone: it is a headless engine; your app
 * renders the picker/progress UI. `autoUpload` defaults to `false` — call
 * `upload()` or files stay `'idle'`. Transport is ONE multipart/form-data request per file to
 * `destination.url` (default method POST, default field name `'file'`,
 * `additionalData` appended as extra fields); the response is parsed as
 * JSON when possible (else raw text) and can be reshaped with
 * `destination.parseResponse`. This is NOT FilePond's process/revert server
 * protocol — any endpoint accepting a multipart POST works. Files that fail
 * validation are reported via `events.onValidationError` and NEVER enter
 * the queue (they won't appear in `getFiles()`). `timeout` defaults to 0
 * (no timeout). Every error/validation message routes through `t()` under the
 * `fileUpload.error.*` namespace with an English `defaultValue`, so English
 * works out of the box. There is no dedicated companion locale bond yet —
 * to translate these, register `fileUpload.error.*` keys with your i18n
 * provider (e.g. `addTranslations('fr', { 'fileUpload.error.timedOut': '…' })`).
 * Interpolated messages expose `{{maxSize}}`, `{{minSize}}`, `{{type}}`,
 * `{{extension}}`, `{{maxFiles}}`, and `{{status}}`.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
