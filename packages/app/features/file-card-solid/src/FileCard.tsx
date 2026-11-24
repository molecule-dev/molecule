/**
 * Solid file representation card — icon (or thumbnail), filename, formatted
 * size, relative modified date, and an optional trailing actions slot, in
 * `'grid'` (square tile) or `'row'` (horizontal line) layout.
 *
 * Solid counterpart of `@molecule/app-file-card-react`'s `FileCard` — the
 * same props (React names) and the same DOM for the same input.
 *
 * @module
 */

import { type Component, type JSX, Show } from 'solid-js'

import { PresentWhileNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import { FileIcon } from './FileIcon.jsx'
import { relativeBucket, type SizeParts, sizeParts } from './format.js'
import type { FileCardProps, FileKind } from './types.js'

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
 * Resolve the human-readable kind label via `t()`. One literal key per
 * `FileKind` so the i18n gate can verify every key exists in the locale
 * bond (a runtime-built `` `file-card.kind.${kind}` `` cannot be checked).
 *
 * @param kind - File kind.
 * @param t - The `useTranslation()` `t` function.
 * @returns The localized kind label.
 */
function kindText(kind: FileKind, t: TFn): string {
  switch (kind) {
    case 'image':
      return t('file-card.kind.image', {}, { defaultValue: 'Image file' })
    case 'video':
      return t('file-card.kind.video', {}, { defaultValue: 'Video file' })
    case 'audio':
      return t('file-card.kind.audio', {}, { defaultValue: 'Audio file' })
    case 'document':
      return t('file-card.kind.document', {}, { defaultValue: 'Document' })
    case 'archive':
      return t('file-card.kind.archive', {}, { defaultValue: 'Archive' })
    case 'code':
      return t('file-card.kind.code', {}, { defaultValue: 'Code file' })
    case 'folder':
      return t('file-card.kind.folder', {}, { defaultValue: 'Folder' })
    case 'other':
      return t('file-card.kind.other', {}, { defaultValue: 'File' })
  }
}

/**
 * Resolve the size's unit word via `t()`, with the number {@link sizeParts}
 * already displayed: one literal key per `SizeUnit` — the same pattern as
 * {@link kindText} — so the i18n gate can verify every key exists in the
 * locale bond, and the `{{n}}` placeholder lets a translation move the number
 * or rename the token (French octets, Russian КБ).
 *
 * @param size - The size's displayed number and unit (`sizeParts(file.size)`).
 * @param t - The `useTranslation()` `t` function.
 * @returns The localized size text.
 */
function sizeUnitText(size: SizeParts, t: TFn): string {
  switch (size.unit) {
    case 'B':
      return t('file-card.size.b', { n: size.n }, { defaultValue: '{{n}} B' })
    case 'KB':
      return t('file-card.size.kb', { n: size.n }, { defaultValue: '{{n}} KB' })
    case 'MB':
      return t('file-card.size.mb', { n: size.n }, { defaultValue: '{{n}} MB' })
    case 'GB':
      return t('file-card.size.gb', { n: size.n }, { defaultValue: '{{n}} GB' })
    case 'TB':
      return t('file-card.size.tb', { n: size.n }, { defaultValue: '{{n}} TB' })
    case 'PB':
      return t('file-card.size.pb', { n: size.n }, { defaultValue: '{{n}} PB' })
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
 * @param props - Component props (see {@link FileCardProps}).
 * @returns The file card element.
 */
export const FileCard: Component<FileCardProps> = (props) => {
  const { t } = useTranslation()
  const cm = getClassMap()

  const kindLabel = (): string => kindText(props.file.kind, t)
  const sizePartsOf = (): SizeParts | undefined =>
    props.file.kind === 'folder' ? undefined : sizeParts(props.file.size)
  const sizeText = (): string => {
    const size = sizePartsOf()
    return size ? sizeUnitText(size, t) : ''
  }
  const sizeLabel = (): string =>
    sizeText()
      ? t('file-card.aria.size', { size: sizeText() }, { defaultValue: 'Size {{size}}' })
      : ''
  const modifiedText = (): string =>
    props.file.modifiedAt ? relativeText(props.file.modifiedAt, t, props.now) : ''
  const modifiedLabel = (): string =>
    modifiedText()
      ? t(
          'file-card.aria.modified',
          { when: modifiedText() },
          { defaultValue: 'Modified {{when}}' },
        )
      : ''
  const ariaLabel = (): string =>
    t(
      'file-card.aria.root',
      { name: props.file.name, kind: kindLabel() },
      {
        defaultValue: '{{name}}, {{kind}}',
      },
    )
  const rootMolId = (): string => props.dataMolId ?? `file-card-${props.file.id}`

  /**
   * Forward a body activation (a click on the select button, or Enter / Space
   * on it) to the consumer.
   *
   * @param event - DOM mouse event.
   */
  const handleClick = (event: MouseEvent): void => {
    props.onClick?.(props.file, event)
  }

  /**
   * Forward right-click to the consumer.
   *
   * @param event - DOM mouse event.
   */
  const handleContextMenu = (event: MouseEvent): void => {
    if (props.onContextMenu) props.onContextMenu(props.file, event)
  }

  /**
   * The row icon: the thumbnail `<img>` at its 40px tile, else the glyph at 28.
   *
   * @returns The icon element.
   */
  const rowIcon = (): JSX.Element =>
    props.file.thumbnail ? (
      <img
        src={props.file.thumbnail}
        alt=""
        style={{ width: '40px', height: '40px', 'object-fit': 'cover', 'border-radius': '4px' }}
      />
    ) : (
      <FileIcon kind={props.file.kind} size={28} />
    )

  /**
   * The grid icon: the thumbnail `<img>` filling the square tile, else the
   * glyph at 48.
   *
   * @returns The icon element.
   */
  const gridIcon = (): JSX.Element =>
    props.file.thumbnail ? (
      <img
        src={props.file.thumbnail}
        alt=""
        style={{ width: '100%', height: '100%', 'object-fit': 'cover', 'border-radius': '4px' }}
      />
    ) : (
      <FileIcon kind={props.file.kind} size={48} />
    )

  /**
   * The card's select control: a transparent native button covering the card
   * (Enter / Space activate it natively), above the content and below the
   * actions slot. A sibling of the actions, not their wrapper, so the action
   * buttons stay reachable controls (a button's children are presentational).
   *
   * @returns The select button, or null without `onClick`.
   */
  const selectButton = (): JSX.Element | null =>
    props.onClick ? (
      <button
        type="button"
        aria-label={ariaLabel()}
        aria-pressed={props.selected ? 'true' : 'false'}
        data-mol-id="file-card-select"
        onClick={handleClick}
        /* mol-bespoke-button: the whole card is the hit area, not a CTA — an
           empty, transparent button over the card; the inline background/
           border/padding are native resets. */
        class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
        style={{ background: 'transparent', border: 'medium', padding: '0px' }}
      />
    ) : null

  /**
   * The size + modified meta line, with an `aria-hidden` separator between
   * the two present.
   *
   * @returns The meta element, or null when neither is present.
   */
  const meta = (): JSX.Element | null => {
    if (!sizeText() && !modifiedText()) return null
    return (
      <div
        class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
        data-mol-id="file-card-meta"
      >
        {sizeText() && (
          <span aria-label={sizeLabel()} data-mol-id="file-card-size">
            {sizeText()}
          </span>
        )}
        {sizeText() && modifiedText() && <span aria-hidden="true">·</span>}
        {modifiedText() && (
          <span aria-label={modifiedLabel()} data-mol-id="file-card-modified">
            {modifiedText()}
          </span>
        )}
      </div>
    )
  }

  /**
   * The trailing actions region, a sibling of the select button.
   *
   * @returns The actions element, or nothing without actions.
   */
  const actions = (): JSX.Element => (
    <PresentWhileNode node={props.actions}>
      {(actions) => (
        <div
          class={
            props.layout === 'row'
              ? cm.cn(cm.shrink0, cm.position('relative'))
              : cm.cn(
                  cm.flex({ align: 'center', justify: 'end', gap: 'sm' }),
                  cm.position('relative'),
                )
          }
          data-mol-id="file-card-actions"
        >
          {actions()}
        </div>
      )}
    </PresentWhileNode>
  )

  /**
   * The row layout: a horizontal line item — icon, name + meta, then the
   * select button and the actions region.
   *
   * @returns The row card element.
   */
  const rowLayout = (): JSX.Element => (
    <div
      role="group"
      aria-label={ariaLabel()}
      data-mol-id={rootMolId()}
      data-selected={props.selected ? 'true' : undefined}
      class={cm.cn(
        cm.flex({ align: 'center', gap: 'md' }),
        cm.sp('p', 2),
        props.onClick ? cm.position('relative') : undefined,
        props.className,
      )}
      oncontextmenu={handleContextMenu}
    >
      <div class={cm.cn(cm.shrink0)} data-mol-id="file-card-icon">
        {rowIcon()}
      </div>
      <div class={cm.cn(cm.stack(0 as const))} style={{ flex: '1 1 0%', 'min-width': '0px' }}>
        <div
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
          data-mol-id="file-card-name"
          style={{ overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}
        >
          {props.file.name}
        </div>
        {meta()}
      </div>
      {selectButton()}
      {actions()}
    </div>
  )

  /**
   * The grid layout (default): a square tile — icon above name and meta,
   * then the select button and the actions region.
   *
   * @returns The grid card element.
   */
  const gridLayout = (): JSX.Element => (
    <div
      role="group"
      aria-label={ariaLabel()}
      data-mol-id={rootMolId()}
      data-selected={props.selected ? 'true' : undefined}
      class={cm.cn(
        cm.stack(1 as const),
        cm.sp('p', 3),
        props.onClick ? cm.position('relative') : undefined,
        props.className,
      )}
      oncontextmenu={handleContextMenu}
    >
      <div
        class={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
        data-mol-id="file-card-icon"
        style={{ 'aspect-ratio': '1 / 1', width: '100%' }}
      >
        {gridIcon()}
      </div>
      <div
        class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        data-mol-id="file-card-name"
        style={{ overflow: 'hidden', 'text-overflow': 'ellipsis', 'white-space': 'nowrap' }}
      >
        {props.file.name}
      </div>
      {meta()}
      {selectButton()}
      {actions()}
    </div>
  )

  // The layout branch is reactive: a `layout` prop change swaps the trees
  // the way React's re-render does.
  return (
    <Show when={props.layout === 'row'} fallback={gridLayout()}>
      {rowLayout()}
    </Show>
  )
}
