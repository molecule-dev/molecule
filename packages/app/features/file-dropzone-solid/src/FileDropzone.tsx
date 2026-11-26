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

import { createBrowserFileInput, fromBrowserFile } from '@molecule/app-filesystem'
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

  const handlers = createBrowserFileInput(
    () => inputEl,
    () => props,
    fromBrowserFile,
  )

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
        if (handlers.onDragOver(event)) setDragging(true)
      }}
      onDragLeave={() => {
        setDragging(false)
      }}
      onDrop={(event) => {
        setDragging(false)
        handlers.onDrop(event)
      }}
      onClick={handlers.onClick}
      onKeyDown={handlers.onKeyDown}
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
        onChange={handlers.onChange}
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
