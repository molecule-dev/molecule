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
 * import { FileCard, type FileSummary } from '@molecule/app-file-card-react'
 *
 * const file: FileSummary = {
 *   id: 'f-1',
 *   name: 'Q3-report.pdf',
 *   size: 482_137,
 *   kind: 'document',
 *   modifiedAt: '2026-04-30T18:23:00Z',
 * }
 *
 * <FileCard
 *   file={file}
 *   layout="grid"
 *   onClick={(f) => openFile(f.id)}
 *   actions={<KebabMenu fileId={file.id} />}
 * />
 * ```
 *
 * @remarks
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
