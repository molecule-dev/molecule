/**
 * Vue file representation card — icon (or thumbnail), filename, formatted
 * size, relative modified date, and an optional trailing actions slot, in
 * `'grid'` (square tile) or `'row'` (horizontal line) layout.
 *
 * Vue counterpart of `@molecule/app-file-card-react`'s `FileCard` — the same
 * props (React names) and the same DOM for the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { useTranslation } from '@molecule/app-vue'

import { FileIcon } from './FileIcon.js'
import { relativeBucket, type SizeParts, sizeParts } from './format.js'
import type { FileCardProps, FileKind, FileSummary } from './types.js'

/** The translation function shape we use here — matches `useTranslation().t`. */
type TFn = (
  key: string,
  values?: Record<string, string | number | boolean | Date>,
  options?: { defaultValue?: string },
) => string

/**
 * Resolves the node-valued `actions` prop that may also arrive as a
 * same-named slot: the prop wins, and an absent pair contributes nothing.
 *
 * @param prop - The prop value, when the caller passed the prop.
 * @param slot - The slot render function, when the caller passed the slot.
 * @returns The children to render.
 */
const propOrSlot = (
  prop: VNodeChild | null | undefined,
  slot: (() => VNodeChild[]) | undefined,
): VNodeChild[] => {
  if (prop !== undefined && prop !== null && prop !== false) return [prop]
  if (slot) return slot()
  return []
}

/**
 * Resolve the relative-time text for a file via `t()`. Keeps the render clean
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
 * @returns The file card component.
 */
export const FileCard = defineComponent({
  name: 'FileCard',
  props: {
    file: {
      type: Object as PropType<FileSummary>,
      required: true,
    },
    selected: {
      type: Boolean,
      default: undefined,
    },
    onClick: {
      type: Function as PropType<FileCardProps['onClick']>,
      default: undefined,
    },
    onContextMenu: {
      type: Function as PropType<FileCardProps['onContextMenu']>,
      default: undefined,
    },
    layout: {
      type: String as PropType<'grid' | 'row'>,
      default: 'grid',
    },
    // Node-valued prop: declared with `null` (any runtime type, no
    // validation — a VNode, a string, or nothing to hide the region).
    actions: null,
    now: {
      type: Object as PropType<Date>,
      default: undefined,
    },
    className: {
      type: String,
      default: undefined,
    },
    dataMolId: {
      type: String,
      default: undefined,
    },
  },
  setup(props, { slots }) {
    const { t } = useTranslation()
    const cm = getClassMap()

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

    return (): VNode => {
      const file = props.file
      const kindLabel = kindText(file.kind, t)
      const size = file.kind === 'folder' ? undefined : sizeParts(file.size)
      const sizeText = size ? sizeUnitText(size, t) : ''
      const sizeLabel = sizeText
        ? t('file-card.aria.size', { size: sizeText }, { defaultValue: 'Size {{size}}' })
        : ''
      const modifiedText = file.modifiedAt ? relativeText(file.modifiedAt, t, props.now) : ''
      const modifiedLabel = modifiedText
        ? t(
            'file-card.aria.modified',
            { when: modifiedText },
            { defaultValue: 'Modified {{when}}' },
          )
        : ''
      const ariaLabel = t(
        'file-card.aria.root',
        { name: file.name, kind: kindLabel },
        { defaultValue: '{{name}}, {{kind}}' },
      )

      const rootMolId = props.dataMolId ?? `file-card-${file.id}`

      // The card's select control: a transparent native button covering the
      // card (Enter / Space activate it natively), above the content and
      // below the actions slot. A sibling of the actions, not their wrapper,
      // so the action buttons stay reachable controls (a button's children
      // are presentational).
      const selectButton: VNode | null = props.onClick
        ? h('button', {
            type: 'button',
            'aria-label': ariaLabel,
            'aria-pressed': props.selected ? 'true' : 'false',
            'data-mol-id': 'file-card-select',
            onClick: handleClick,
            // mol-bespoke-button: the whole card is the hit area, not a CTA —
            // an empty, transparent button over the card; the inline
            // background/border/padding are native resets.
            class: cm.cn(cm.position('absolute'), cm.inset0, cm.cursorPointer),
            style: { background: 'transparent', border: 'none', padding: '0' },
          })
        : null

      // React renders `{sizeText && modifiedText && <span aria-hidden>·</span>}`.
      const separator: VNode | null =
        sizeText && modifiedText ? h('span', { 'aria-hidden': 'true' }, ['·']) : null

      const meta =
        sizeText || modifiedText
          ? h(
              'div',
              {
                class: cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs')),
                'data-mol-id': 'file-card-meta',
              },
              [
                ...(sizeText
                  ? [
                      h('span', { 'aria-label': sizeLabel, 'data-mol-id': 'file-card-size' }, [
                        sizeText,
                      ]),
                    ]
                  : []),
                ...(separator ? [separator] : []),
                ...(modifiedText
                  ? [
                      h(
                        'span',
                        {
                          'aria-label': modifiedLabel,
                          'data-mol-id': 'file-card-modified',
                        },
                        [modifiedText],
                      ),
                    ]
                  : []),
              ],
            )
          : null

      const actionNodes = propOrSlot(props.actions, slots.actions)
      const actions = actionNodes.length
        ? h(
            'div',
            {
              class:
                props.layout === 'row'
                  ? cm.cn(cm.shrink0, cm.position('relative'))
                  : cm.cn(
                      cm.flex({ align: 'center', justify: 'end', gap: 'sm' }),
                      cm.position('relative'),
                    ),
              'data-mol-id': 'file-card-actions',
            },
            actionNodes,
          )
        : null

      if (props.layout === 'row') {
        return h(
          'div',
          {
            role: 'group',
            'aria-label': ariaLabel,
            'data-mol-id': rootMolId,
            'data-selected': props.selected ? 'true' : undefined,
            class: cm.cn(
              cm.flex({ align: 'center', gap: 'md' }),
              cm.sp('p', 2),
              props.onClick ? cm.position('relative') : undefined,
              props.className,
            ),
            onContextmenu: handleContextMenu,
          },
          [
            h('div', { class: cm.shrink0, 'data-mol-id': 'file-card-icon' }, [
              file.thumbnail
                ? h('img', {
                    src: file.thumbnail,
                    alt: '',
                    style: {
                      width: '40px',
                      height: '40px',
                      objectFit: 'cover',
                      borderRadius: '4px',
                    },
                  })
                : h(FileIcon, { kind: file.kind, size: 28 }),
            ]),
            h('div', { class: cm.stack(0), style: { flex: '1', minWidth: '0' } }, [
              h(
                'div',
                {
                  class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')),
                  'data-mol-id': 'file-card-name',
                  style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
                },
                [file.name],
              ),
              meta,
            ]),
            selectButton,
            actions,
          ],
        )
      }

      // Grid layout (default).
      return h(
        'div',
        {
          role: 'group',
          'aria-label': ariaLabel,
          'data-mol-id': rootMolId,
          'data-selected': props.selected ? 'true' : undefined,
          class: cm.cn(
            cm.stack(1),
            cm.sp('p', 3),
            props.onClick ? cm.position('relative') : undefined,
            props.className,
          ),
          onContextmenu: handleContextMenu,
        },
        [
          h(
            'div',
            {
              class: cm.flex({ align: 'center', justify: 'center' }),
              'data-mol-id': 'file-card-icon',
              style: { aspectRatio: '1 / 1', width: '100%' },
            },
            [
              file.thumbnail
                ? h('img', {
                    src: file.thumbnail,
                    alt: '',
                    style: {
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      borderRadius: '4px',
                    },
                  })
                : h(FileIcon, { kind: file.kind, size: 48 }),
            ],
          ),
          h(
            'div',
            {
              class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')),
              'data-mol-id': 'file-card-name',
              style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
            },
            [file.name],
          ),
          meta,
          selectButton,
          actions,
        ],
      )
    }
  },
})
