/**
 * React file card primitives.
 *
 * Exports:
 * - `<FileCard>` — file representation card (icon/thumbnail + name + size + modified date + optional actions).
 *   Two layouts: `'grid'` (square tile, default) and `'row'` (horizontal list line).
 * - `<FileIcon>` — stroke-currentColor SVG glyph keyed by `FileKind`.
 * - `bytes(value)` — pure helper that formats a byte count as `420 B` / `1.4 KB` / `2.3 MB` / etc.
 * - `relativeBucket(at, now?)` — pure helper that buckets a timestamp into `just-now` / `minutes` /
 *   `hours` / `days` / `weeks` / `months` / `absolute`.
 * - `FileSummary` / `FileKind` types — stable shape for the consumer's domain model.
 *
 * Used by cloud-file-manager (grid + list views), social-media + email-client
 * (attachment previews), and document-collaboration (sidebars).
 *
 * @example
 * ```tsx
 * import { useState } from 'react'
 *
 * import { FileCard, type FileSummary } from '@molecule/app-file-card-react'
 * import { getClassMap } from '@molecule/app-ui'
 *
 * export function AttachmentsList() {
 *   const cm = getClassMap()
 *   const files: FileSummary[] = [
 *     { id: 'f-1', name: 'Q3-report.pdf', size: 482_137, kind: 'document', modifiedAt: '2026-04-30T18:23:00Z' },
 *     { id: 'f-2', name: 'Designs', size: 0, kind: 'folder' },
 *   ]
 *   const [selectedId, setSelectedId] = useState<string | null>(null)
 *   return (
 *     <div>
 *       {files.map((file) => (
 *         <FileCard
 *           key={file.id}
 *           file={file}
 *           layout="row"
 *           selected={file.id === selectedId}
 *           className={file.id === selectedId ? cm.surfaceSecondary : undefined}
 *           onClick={(f) => setSelectedId(f.id)}
 *           actions={file.kind === 'folder' ? undefined : <a href={`/files/${file.id}/download`} download>Download</a>}
 *         />
 *       ))}
 *     </div>
 *   )
 * }
 * ```
 *
 * @remarks
 * - `selected` only sets `aria-pressed` / `data-selected` — it adds NO visual
 *   highlight. Pass a highlight class yourself (e.g. `cm.surfaceSecondary`
 *   via `className`) when selected.
 * - `onClick` makes the card `role="button"` + focusable, but there is NO
 *   Enter/Space key handling — keep a keyboard path in `actions` (a real
 *   link/button) for anything important. Clicks inside `actions` never
 *   fire `onClick`.
 * - `size` is BYTES (formatted by `bytes()`, 1024-based); folders never show
 *   a size. `modifiedAt` renders as relative text (`2 days ago`), switching
 *   to an ISO date (`2026-04-30`) after 365 days — pass `now` for
 *   deterministic output in tests/snapshots.
 * - Must render inside `<I18nProvider>` / `<MoleculeProvider>` (it calls
 *   `useTranslation()`), and `getClassMap()` throws unless
 *   `setClassMap(classMap)` from `@molecule/app-ui` ran at startup.
 *
 * All styling routes through `getClassMap()` from `@molecule/app-ui` —
 * swap the ClassMap bond to restyle without touching this package.
 *
 * All user-visible text routes through `t()` and translates via the
 * companion `@molecule/app-locales-file-card` locale bond. English
 * fallbacks are inlined so the card works without the locale bond present.
 *
 * @module
 */

export * from './FileCard.js'
export * from './FileIcon.js'
export * from './format.js'
