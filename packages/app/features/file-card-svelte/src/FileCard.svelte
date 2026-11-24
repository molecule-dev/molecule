<!--
  FileCard: the Svelte counterpart of `@molecule/app-file-card-react`'s
  `FileCard` — file representation card (icon/thumbnail + name + size +
  relative modified date + optional actions slot) in `'grid'` (square tile)
  or `'row'` (horizontal line) layout. Same props, same DOM for the same
  input.

  Whitespace is deliberate: React's JSX strips whitespace-only text between
  elements, so every element opens glued to the previous tag's close and no
  stray whitespace text nodes render.
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import FileIcon from './FileIcon.svelte'
  import { relativeBucket, type SizeParts, sizeParts } from './format.js'
  import { reactStyle } from './style.js'
  import type { FileCardProps, FileKind } from './types.js'

  /** The translation function shape we use here — matches `useTranslation().t`. */
  type TFn = (
    key: string,
    values?: Record<string, string | number | boolean | Date>,
    options?: { defaultValue?: string },
  ) => string

  /**
   * Resolve the relative-time text for a file via `t()`. Keeps the template
   * clean and centralizes the bucket → key mapping.
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

  let {
    file,
    selected,
    onClick,
    onContextMenu,
    layout = 'grid',
    actions,
    now,
    className,
    dataMolId,
  }: FileCardProps = $props()

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  const kindLabel = $derived(kindText(file.kind, t))
  const size = $derived(file.kind === 'folder' ? undefined : sizeParts(file.size))
  const sizeText = $derived(size ? sizeUnitText(size, t) : '')
  const sizeLabel = $derived(
    sizeText ? t('file-card.aria.size', { size: sizeText }, { defaultValue: 'Size {{size}}' }) : '',
  )
  const modifiedText = $derived(file.modifiedAt ? relativeText(file.modifiedAt, t, now) : '')
  const modifiedLabel = $derived(
    modifiedText
      ? t('file-card.aria.modified', { when: modifiedText }, { defaultValue: 'Modified {{when}}' })
      : '',
  )
  const ariaLabel = $derived(
    t(
      'file-card.aria.root',
      { name: file.name, kind: kindLabel },
      {
        defaultValue: '{{name}}, {{kind}}',
      },
    ),
  )
  const rootMolId = $derived(dataMolId ?? `file-card-${file.id}`)
  const isRow = $derived(layout === 'row')

  /**
   * Forward a body activation (a click on the select button, or Enter / Space
   * on it) to the consumer.
   *
   * @param event - DOM mouse event.
   */
  function handleClick(event: MouseEvent): void {
    onClick?.(file, event)
  }

  /**
   * Forward right-click to the consumer.
   *
   * @param event - DOM mouse event.
   */
  function handleContextMenu(event: MouseEvent): void {
    if (onContextMenu) onContextMenu(file, event)
  }
</script>

{#if isRow}<div
    role="group"
    aria-label={ariaLabel}
    data-mol-id={rootMolId}
    data-selected={selected ? 'true' : undefined}
    class={cm.cn(
      cm.flex({ align: 'center', gap: 'md' }),
      cm.sp('p', 2),
      onClick ? cm.position('relative') : undefined,
      className,
    )}
    oncontextmenu={handleContextMenu}
  >
    <div class={cm.cn(cm.shrink0)} data-mol-id="file-card-icon">
      {#if file.thumbnail}<img
          src={file.thumbnail}
          alt=""
          use:reactStyle={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
        />{:else}<FileIcon kind={file.kind} size={28} />{/if}
    </div>
    <div class={cm.cn(cm.stack(0))} use:reactStyle={{ flex: 1, minWidth: 0 }}>
      <div
        class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
        data-mol-id="file-card-name"
        use:reactStyle={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
      >
        {file.name}
      </div>
      {#if sizeText || modifiedText}<div
          class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
          data-mol-id="file-card-meta"
        >
          {#if sizeText}<span aria-label={sizeLabel} data-mol-id="file-card-size">{sizeText}</span
            >{/if}{#if sizeText && modifiedText}<span aria-hidden="true">·</span
            >{/if}{#if modifiedText}<span
              aria-label={modifiedLabel}
              data-mol-id="file-card-modified">{modifiedText}</span
            >{/if}
        </div>{/if}
    </div>
    {#if onClick}<button
        type="button"
        aria-label={ariaLabel}
        aria-pressed={selected ? 'true' : 'false'}
        data-mol-id="file-card-select"
        onclick={handleClick}
        class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
        use:reactStyle={{ background: 'transparent', border: 'none', padding: 0 }}
      ></button>{/if}{#if actions}<PresentWhileContent
        class={cm.cn(cm.shrink0, cm.position('relative'))}
        data-mol-id="file-card-actions"
      >
        {@render actions?.()}
      </PresentWhileContent>{/if}
  </div>{:else}<div
    role="group"
    aria-label={ariaLabel}
    data-mol-id={rootMolId}
    data-selected={selected ? 'true' : undefined}
    class={cm.cn(
      cm.stack(1),
      cm.sp('p', 3),
      onClick ? cm.position('relative') : undefined,
      className,
    )}
    oncontextmenu={handleContextMenu}
  >
    <div
      class={cm.cn(cm.flex({ align: 'center', justify: 'center' }))}
      data-mol-id="file-card-icon"
      use:reactStyle={{ aspectRatio: '1 / 1', width: '100%' }}
    >
      {#if file.thumbnail}<img
          src={file.thumbnail}
          alt=""
          use:reactStyle={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }}
        />{:else}<FileIcon kind={file.kind} size={48} />{/if}
    </div>
    <div
      class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}
      data-mol-id="file-card-name"
      use:reactStyle={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
    >
      {file.name}
    </div>
    {#if sizeText || modifiedText}<div
        class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
        data-mol-id="file-card-meta"
      >
        {#if sizeText}<span aria-label={sizeLabel} data-mol-id="file-card-size">{sizeText}</span
          >{/if}{#if sizeText && modifiedText}<span aria-hidden="true">·</span
          >{/if}{#if modifiedText}<span aria-label={modifiedLabel} data-mol-id="file-card-modified"
            >{modifiedText}</span
          >{/if}
      </div>{/if}
    {#if onClick}<button
        type="button"
        aria-label={ariaLabel}
        aria-pressed={selected ? 'true' : 'false'}
        data-mol-id="file-card-select"
        onclick={handleClick}
        class={cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer)}
        use:reactStyle={{ background: 'transparent', border: 'none', padding: 0 }}
      ></button>{/if}{#if actions}<PresentWhileContent
        class={cm.cn(
          cm.flex({ align: 'center', justify: 'end', gap: 'sm' }),
          cm.position('relative'),
        )}
        data-mol-id="file-card-actions"
      >
        {@render actions?.()}
      </PresentWhileContent>{/if}
  </div>{/if}
