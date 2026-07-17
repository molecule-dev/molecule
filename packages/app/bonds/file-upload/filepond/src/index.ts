/**
 * FilePond file upload provider for the molecule file upload interface.
 *
 * Implements `FileUploadProvider` from `@molecule/app-file-upload` using a
 * headless upload engine with validation, progress tracking, concurrency
 * control, and image preview generation following FilePond's patterns.
 *
 * @example
 * ```typescript
 * import { provider } from '@molecule/app-file-upload-filepond'
 * import { setProvider } from '@molecule/app-file-upload'
 *
 * setProvider(provider)
 * ```
 *
 * @remarks
 * Transport is ONE multipart/form-data request per file to
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
