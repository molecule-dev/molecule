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
 * (no timeout). Error/validation messages are currently untranslated
 * English strings — localize in your handlers before display.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
