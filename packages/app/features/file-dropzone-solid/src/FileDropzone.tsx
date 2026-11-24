/**
 * Solid drag-drop + click-to-browse file upload zone.
 *
 * Solid counterpart of `@molecule/app-file-dropzone-react`'s `FileDropzone` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { type Component, createSignal, type JSX, Show } from 'solid-js'

import { ResolveNode, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'

import type { FileDropzoneProps } from './types.js'

/**
 * Drag-drop + click-to-browse file upload zone. Pure UI — apps handle
 * the actual upload.
 *
 * Rejects files exceeding `maxSize` or not matching `accept` (best-effort
 * extension/MIME check) via `onRejected`.
 *
 * @param props - Component props (see {@link FileDropzoneProps}).
 * @returns The rendered file dropzone.
 */
export const FileDropzone: Component<FileDropzoneProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [dragging, setDragging] = createSignal(false)
  let inputEl: HTMLInputElement | undefined

  /**
   * Filters a file list into kept and rejected files, exactly as React does:
   * a file over `maxSize` is rejected, then a file matching neither the
   * accept extension nor the accept MIME token is rejected (`'*'` accepts
   * everything).
   *
   * @param raw - The files the user dropped or picked.
   * @returns The kept and rejected files.
   */
  const filter = (raw: FileList | File[]): { kept: File[]; rejected: File[] } => {
    const arr = Array.from(raw)
    const kept: File[] = []
    const rejected: File[] = []
    for (const f of arr) {
      if (props.maxSize && f.size > props.maxSize) {
        rejected.push(f)
        continue
      }
      // cheap accept check
      if (props.accept) {
        const okByExt = props.accept
          .split(',')
          .some(
            (a) =>
              a.trim() && f.name.toLowerCase().endsWith(a.trim().toLowerCase().replace(/^\./, '.')),
          )
        const okByMime = props.accept
          .split(',')
          .some(
            (a) =>
              a.trim() &&
              f.type &&
              (f.type === a.trim() ||
                (a.trim().endsWith('/*') && f.type.startsWith(a.trim().replace('/*', '/')))),
          )
        if (!okByExt && !okByMime && props.accept !== '*') {
          rejected.push(f)
          continue
        }
      }
      kept.push(f)
    }
    return { kept, rejected }
  }

  /**
   * Filters the given file list and dispatches kept/rejected files to the
   * callbacks — only the first kept file unless `multiple` is set.
   *
   * @param list - The files from the drop or the hidden input.
   */
  function dispatch(list: FileList | File[]): void {
    const { kept, rejected } = filter(list)
    if (kept.length > 0) props.onFiles(props.multiple ? kept : [kept[0]!])
    if (rejected.length > 0) props.onRejected?.(rejected)
  }

  /** Opens the native file dialog through the hidden input. */
  const openDialog = (): void => {
    inputEl?.click()
  }

  /**
   * The drop surface's inline style — React's dashed drop region, whose border
   * thickens and whose fill tints on drag-over. The colours are theme tokens;
   * no ClassMap tier is a dashed drop region. Keys are kebab-case because
   * Solid's runtime writes each entry with `style.setProperty`.
   *
   * @returns The style object.
   */
  const zoneStyle = (): Record<string, string> =>
    dragging()
      ? {
          border: '2px dashed var(--mol-color-primary, #3366ff)',
          'border-radius': '12px',
          'min-height': '140px',
          background: 'color-mix(in srgb, var(--mol-color-primary, #3366ff) 6%, transparent)',
        }
      : {
          border: '2px dashed var(--mol-color-border, rgba(128,128,128,0.35))',
          'border-radius': '12px',
          'min-height': '140px',
        }

  /**
   * The default copy React renders when no children are given.
   *
   * @returns The copy nodes.
   */
  const defaultCopy = (): JSX.Element => (
    <>
      <p class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
        {t('fileDropzone.dropHere', {}, { defaultValue: 'Drop files here or click to browse' })}
      </p>
      <Show when={props.accept}>
        {(accept) => (
          <p class={cm.cn(cm.textSize('xs'), cm.sp('mt', 1))}>
            {t(
              'fileDropzone.accepts',
              { accept: accept() },
              { defaultValue: 'Accepts: {{accept}}' },
            )}
          </p>
        )}
      </Show>
    </>
  )

  return (
    <div
      onDragOver={(event) => {
        if (!props.disabled) {
          event.preventDefault()
          setDragging(true)
        }
      }}
      onDragLeave={() => {
        setDragging(false)
      }}
      onDrop={(event) => {
        event.preventDefault()
        setDragging(false)
        if (!props.disabled && event.dataTransfer?.files) dispatch(event.dataTransfer.files)
      }}
      onClick={() => {
        if (!props.disabled) openDialog()
      }}
      onKeyDown={(event) => {
        // role="button" gets no native keyboard activation — wire Enter/Space
        // to open the file dialog so keyboard users can browse (preventDefault
        // stops Space from scrolling the page).
        if (props.disabled) return
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
          event.preventDefault()
          openDialog()
        }
      }}
      data-mol-id="file-dropzone"
      role="button"
      tabIndex={0}
      aria-disabled={props.disabled}
      class={cm.cn(
        cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
        cm.sp('p', 6),
        cm.textCenter,
        !props.disabled ? cm.cursorPointer : undefined,
        props.className,
      )}
      style={zoneStyle()}
    >
      <input
        ref={(element) => {
          inputEl = element
        }}
        type="file"
        accept={props.accept}
        multiple={props.multiple}
        disabled={props.disabled}
        onChange={(event) => {
          const files = event.target.files
          if (files) dispatch(files)
        }}
        style={{ display: 'none' }}
      />
      <ResolveNode node={props.children}>
        {(content, hasContent) => (
          <Show when={hasContent()} fallback={defaultCopy()}>
            {content()}
          </Show>
        )}
      </ResolveNode>
    </div>
  )
}
