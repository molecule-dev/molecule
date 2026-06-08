import type { JSX, MouseEvent, ReactNode } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'

import { FileIcon, type FileKind } from './FileIcon.js'
import { bytes, relativeBucket } from './format.js'

/**
 * Minimal description of a file shown in a `<FileCard>`. Apps map their own
 * domain types onto this shape — there is no required mime field; pass
 * `kind` instead so the icon matches even when only a filename is known.
 */
export interface FileSummary {
  /** Stable identifier for the file (parent React key + `data-mol-id` suffix). */
  id: string
  /** Display name (filename including extension). */
  name: string
  /** Size in bytes. Pass `0` for folders or unknown. */
  size: number
  /** File kind — drives the icon and the "kind" aria token. */
  kind: FileKind
  /** Last-modified timestamp (ISO string, ms epoch, or `Date`). Optional. */
  modifiedAt?: string | number | Date
  /** Optional thumbnail URL. When set, replaces the icon in `'grid'` layout. */
  thumbnail?: string
}

/** Props for `<FileCard>`. */
export interface FileCardProps {
  /** The file to render. */
  file: FileSummary
  /** Selected highlight state. */
  selected?: boolean
  /** Click handler fired on card body click (not on the actions slot). */
  onClick?: (file: FileSummary, event: MouseEvent<HTMLElement>) => void
  /** Context-menu (right-click) handler. */
  onContextMenu?: (file: FileSummary, event: MouseEvent<HTMLElement>) => void
  /** Layout — `'grid'` (default) is a square tile, `'row'` is a horizontal list line. */
  layout?: 'grid' | 'row'
  /** Optional trailing action slot (button row, kebab menu). Clicks here do not fire `onClick`. */
  actions?: ReactNode
  /** Reference "now" for relative-time formatting. Useful for testing/snapshots. */
  now?: Date
  /** Extra classes merged onto the root element. */
  className?: string
  /** Override the root `data-mol-id` (defaults to `file-card-${file.id}`). */
  dataMolId?: string
}

/** The translation function shape we use here — matches `useTranslation().t`. */
type TFn = (
  key: string,
  values?: Record<string, string | number | boolean | Date>,
  options?: { defaultValue?: string },
) => string

/**
 * Resolve the relative-time text for a file via `t()`. Keeps the JSX clean
 * and centralizes the bucket → key mapping.
 *
 * @param at - Modified-at timestamp.
 * @param t - The `useTranslation()` `t` function.
 * @param now - Reference "now".
 * @returns The localized relative-time string.
 */
function relativeText(at: string | number | Date, t: TFn, now: Date | undefined): string {
  const bucket = relativeBucket(at, now)
  switch (bucket.kind) {
    case 'just-now':
      return t('file-card.modified.just-now', {}, { defaultValue: 'just now' })
    case 'minutes':
      return t(
        bucket.n === 1 ? 'file-card.modified.minute-one' : 'file-card.modified.minute-other',
        { count: bucket.n },
        { defaultValue: bucket.n === 1 ? '1 min ago' : `${bucket.n} min ago` },
      )
    case 'hours':
      return t(
        bucket.n === 1 ? 'file-card.modified.hour-one' : 'file-card.modified.hour-other',
        { count: bucket.n },
        { defaultValue: bucket.n === 1 ? '1 hr ago' : `${bucket.n} hr ago` },
      )
    case 'days':
      return t(
        bucket.n === 1 ? 'file-card.modified.day-one' : 'file-card.modified.day-other',
        { count: bucket.n },
        { defaultValue: bucket.n === 1 ? 'yesterday' : `${bucket.n} days ago` },
      )
    case 'weeks':
      return t(
        bucket.n === 1 ? 'file-card.modified.week-one' : 'file-card.modified.week-other',
        { count: bucket.n },
        { defaultValue: bucket.n === 1 ? '1 wk ago' : `${bucket.n} wk ago` },
      )
    case 'months':
      return t(
        bucket.n === 1 ? 'file-card.modified.month-one' : 'file-card.modified.month-other',
        { count: bucket.n },
        { defaultValue: bucket.n === 1 ? '1 mo ago' : `${bucket.n} mo ago` },
      )
    case 'absolute':
      return bucket.iso
  }
}

/**
 * File representation card — icon (or thumbnail), filename, formatted size,
 * relative modified date, and optional trailing actions slot. Used by
 * cloud-file-manager grids/lists, social-media + email-client attachment
 * previews, and document-collaboration sidebars.
 *
 * Two layouts:
 * - `'grid'` (default) — square tile with the icon/thumbnail stacked above
 *   the metadata. Suitable for finder-style grids and attachment galleries.
 * - `'row'` — horizontal line item with the icon on the left, metadata in
 *   the middle, and the actions slot on the right. Suitable for list views
 *   and chat/email attachment rows.
 *
 * All styling routes through `getClassMap()`. All user-visible text routes
 * through `t()` so the card translates via the companion
 * `@molecule/app-locales-file-card` locale bond.
 *
 * @param props - Component props.
 * @param props.file - File summary to render.
 * @param props.selected - Selected highlight state.
 * @param props.onClick - Body click handler.
 * @param props.onContextMenu - Right-click handler.
 * @param props.layout - `'grid'` (default) or `'row'`.
 * @param props.actions - Trailing action slot (button row, kebab menu).
 * @param props.now - Reference "now" for relative-time formatting.
 * @param props.className - Extra root classes.
 * @param props.dataMolId - Override the root `data-mol-id`.
 * @returns The file card element.
 */
export function FileCard({
  file,
  selected,
  onClick,
  onContextMenu,
  layout = 'grid',
  actions,
  now,
  className,
  dataMolId,
}: FileCardProps): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()

  const kindLabel = t(
    `file-card.kind.${file.kind}`,
    {},
    {
      defaultValue:
        file.kind === 'folder'
          ? 'Folder'
          : `${file.kind.charAt(0).toUpperCase() + file.kind.slice(1)} file`,
    },
  )
  const sizeText = file.kind === 'folder' ? '' : bytes(file.size)
  const sizeLabel = sizeText
    ? t('file-card.aria.size', { size: sizeText }, { defaultValue: `Size ${sizeText}` })
    : ''
  const modifiedText = file.modifiedAt ? relativeText(file.modifiedAt, t, now) : ''
  const modifiedLabel = modifiedText
    ? t(
        'file-card.aria.modified',
        { when: modifiedText },
        { defaultValue: `Modified ${modifiedText}` },
      )
    : ''
  const ariaLabel = t(
    'file-card.aria.root',
    { name: file.name, kind: kindLabel },
    { defaultValue: `${file.name}, ${kindLabel}` },
  )

  const rootMolId = dataMolId ?? `file-card-${file.id}`

  /**
   * Wrap a click event so it can be safely fired without consuming clicks
   * that bubbled up from the actions slot.
   *
   * @param event - DOM mouse event.
   */
  const handleClick = (event: MouseEvent<HTMLElement>): void => {
    if (!onClick) return
    // Don't fire body click for events that originated inside the actions slot.
    const target = event.target as HTMLElement | null
    if (target?.closest('[data-mol-id="file-card-actions"]')) return
    onClick(file, event)
  }

  /**
   * Forward right-click to the consumer.
   *
   * @param event - DOM mouse event.
   */
  const handleContextMenu = (event: MouseEvent<HTMLElement>): void => {
    if (onContextMenu) onContextMenu(file, event)
  }

  if (layout === 'row') {
    return (
      <div
        role={onClick ? 'button' : 'group'}
        tabIndex={onClick ? 0 : undefined}
        aria-label={ariaLabel}
        aria-pressed={onClick ? Boolean(selected) : undefined}
        data-mol-id={rootMolId}
        data-selected={selected ? 'true' : undefined}
        className={cm.cn(
          cm.flex({ align: 'center', gap: 'md' }),
          cm.sp('p', 2),
          onClick ? cm.cursorPointer : undefined,
          className,
        )}
        onClick={handleClick}
        onContextMenu={handleContextMenu}
      >
        <div className={cm.cn(cm.shrink0)} data-mol-id="file-card-icon">
          {file.thumbnail ? (
            <img
              src={file.thumbnail}
              alt=""
              style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
            />
          ) : (
            <FileIcon kind={file.kind} size={28} />
          )}
        </div>
        <div className={cm.cn(cm.stack(0 as const))} style={{ flex: 1, minWidth: 0 }}>
          <div
            className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
            data-mol-id="file-card-name"
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {file.name}
          </div>
          {(sizeText || modifiedText) && (
            <div
              className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
              data-mol-id="file-card-meta"
            >
              {sizeText && (
                <span aria-label={sizeLabel} data-mol-id="file-card-size">
                  {sizeText}
                </span>
              )}
              {sizeText && modifiedText && <span aria-hidden="true">·</span>}
              {modifiedText && (
                <span aria-label={modifiedLabel} data-mol-id="file-card-modified">
                  {modifiedText}
                </span>
              )}
            </div>
          )}
        </div>
        {actions && (
          <div className={cm.cn(cm.shrink0)} data-mol-id="file-card-actions">
            {actions}
          </div>
        )}
      </div>
    )
  }

  // Grid layout (default).
  return (
    <div
      role={onClick ? 'button' : 'group'}
      tabIndex={onClick ? 0 : undefined}
      aria-label={ariaLabel}
      aria-pressed={onClick ? Boolean(selected) : undefined}
      data-mol-id={rootMolId}
      data-selected={selected ? 'true' : undefined}
      className={cm.cn(
        cm.stack(1 as const),
        cm.sp('p', 3),
        onClick ? cm.cursorPointer : undefined,
        className,
      )}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      <div
        className={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
        data-mol-id="file-card-icon"
        style={{ aspectRatio: '1 / 1', width: '100%' }}
      >
        {file.thumbnail ? (
          <img
            src={file.thumbnail}
            alt=""
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              borderRadius: 4,
            }}
          />
        ) : (
          <FileIcon kind={file.kind} size={48} />
        )}
      </div>
      <div
        className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        data-mol-id="file-card-name"
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {file.name}
      </div>
      {(sizeText || modifiedText) && (
        <div
          className={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
          data-mol-id="file-card-meta"
        >
          {sizeText && (
            <span aria-label={sizeLabel} data-mol-id="file-card-size">
              {sizeText}
            </span>
          )}
          {sizeText && modifiedText && <span aria-hidden="true">·</span>}
          {modifiedText && (
            <span aria-label={modifiedLabel} data-mol-id="file-card-modified">
              {modifiedText}
            </span>
          )}
        </div>
      )}
      {actions && (
        <div
          className={cm.cn(cm.flex({ align: 'center', justify: 'end', gap: 'sm' }))}
          data-mol-id="file-card-actions"
        >
          {actions}
        </div>
      )}
    </div>
  )
}
