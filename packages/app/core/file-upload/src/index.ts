/**
 * File upload core interface for molecule.dev.
 *
 * Provides a framework-agnostic contract for file uploads with progress
 * tracking, validation, drag-and-drop support, and multi-file queues.
 * Bond a provider (e.g. `@molecule/app-file-upload-filepond`) at startup,
 * then use {@link createUploader} anywhere.
 *
 * @example
 * ```typescript
 * import { createUploader } from '@molecule/app-file-upload'
 *
 * const uploader = createUploader({
 *   destination: { url: '/api/upload' },
 *   validation: { maxSize: 10 * 1024 * 1024, acceptedTypes: ['image/*'] },
 *   multiple: true,
 *   autoUpload: true,
 *   events: {
 *     onComplete: (file) => console.log(`Uploaded: ${file.name}`),
 *   },
 * })
 * ```
 *
 * @e2e
 * Integration checklist — drive the real UI (live preview, no mocks), adapt
 * each item to this app's actual screens/flows, and check every box off one
 * by one. A box you can't check is an integration bug to fix — not a skip:
 * - [ ] Picking a valid file via the picker starts the upload and shows
 *   per-file progress through to a completed state.
 * - [ ] Dragging and dropping a file onto the drop zone uploads it the same
 *   way.
 * - [ ] The completed upload appears wherever this app uses it (file list,
 *   avatar, attachment) — completion is not just a toast.
 * - [ ] A file that fails validation (too large, wrong type) is rejected with
 *   a visible message and is never sent to the server.
 * - [ ] With multiple files (if enabled), each file's progress and completion
 *   track independently and all complete.
 * - [ ] Canceling/removing a queued or in-flight file stops it and clears it
 *   from the queue.
 *
 * @module
 */

export * from './provider.js'
export * from './types.js'
