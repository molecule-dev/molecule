/**
 * Angular file card primitives — the Angular counterpart of
 * `@molecule/app-file-card-react`: the same props and the same DOM for the
 * same input.
 *
 * Exports:
 * - `<FileCard>` — file representation card (icon/thumbnail + name + size + modified date + optional actions).
 *   Two layouts: `'grid'` (square tile, default) and `'row'` (horizontal list line).
 * - `<FileIcon>` — stroke-currentColor SVG glyph keyed by `FileKind`.
 * - `bytes(value)` — pure helper that formats a byte count as `420 B` / `1.4 KB` / `2.3 MB` / etc.
 * - `sizeParts(value)` — the same split as `{ n, unit }`, for rendering the unit through `t()`.
 * - `relativeBucket(at, now?)` — pure helper that buckets a timestamp into `just-now` / `minutes` /
 *   `hours` / `days` / `weeks` / `months` / `absolute`.
 * - `FileSummary` / `FileKind` / `SizeParts` types — stable shape for the consumer's domain model.
 *
 * Used by cloud-file-manager (grid + list views), social-media + email-client
 * (attachment previews), and document-collaboration (sidebars).
 *
 * @example
 * ```ts
 * import { Component } from '@angular/core'
 * import { FileCard } from '@molecule/app-file-card-angular'
 *
 * @Component({
 *   selector: 'app-attachment',
 *   standalone: true,
 *   imports: [FileCard],
 *   template: `
 *     <div mol-file-card [file]="file" [layout]="'grid'" (onClick)="open(file.id)">
 *       <button type="button" slot="actions" (click)="menu($event)">⋯</button>
 *     </div>
 *   `,
 * })
 * export class Attachment {}
 * ```
 *
 * @remarks
 * - All styling routes through `getClassMap()` from `@molecule/app-ui` —
 *   swap the ClassMap bond to restyle without touching this package.
 * - All user-visible text routes through `t()` (via `@molecule/app-angular`'s
 *   `useTranslation`) and translates via the companion
 *   `@molecule/app-locales-file-card` locale bond. English fallbacks are
 *   inlined so the card works without the locale bond present.
 * - Node props are projected content: `actions` is selected by
 *   `[slot=actions]`, everything else lands in the card body as the default
 *   projection.
 *
 * @module
 */

export * from './file-card.component.js'
export * from './file-icon.component.js'
export * from './format.js'
export * from './types.js'
