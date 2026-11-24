/**
 * Vue drag-drop + click-to-browse file upload zone.
 *
 * Vue counterpart of `@molecule/app-file-dropzone-react`'s `FileDropzone` —
 * the same props (React names), the same ClassMap tokens, and the same DOM for
 * the same input.
 *
 * @module
 */

import { defineComponent, h, type PropType, ref, type VNode, type VNodeChild } from 'vue'

import { getClassMap } from '@molecule/app-ui'
import { toChildArray, useTranslation } from '@molecule/app-vue'

import type { FileDropzoneProps } from './types.js'

/**
 * Drag-drop + click-to-browse file upload zone. Pure UI — apps handle
 * the actual upload.
 *
 * Rejects files exceeding `maxSize` or not matching `accept` (best-effort
 * extension/MIME check) via `onRejected`.
 *
 * @param props - Component props (see {@link FileDropzoneProps}).
 * @returns The file dropzone component.
 */
export const FileDropzone = defineComponent({
  name: 'FileDropzone',
  props: {
    onFiles: {
      type: Function as PropType<FileDropzoneProps['onFiles']>,
      required: true,
    },
    accept: String,
    multiple: {
      type: Boolean,
      default: false,
    },
    maxSize: Number,
    onRejected: {
      type: Function as PropType<FileDropzoneProps['onRejected']>,
      default: undefined,
    },
    // Node-valued prop: declared with `null` (any runtime type, no validation —
    // a VNode, a string, or `null` to fall back to the default copy).
    children: null,
    // Boolean with an explicit `undefined` default: React's `disabled` is
    // `boolean | undefined`, and `aria-disabled={undefined}` must stay off the
    // element (Vue's implicit Boolean default would make it `false`).
    disabled: {
      type: Boolean,
      default: undefined,
    },
    className: String,
  },
  setup(props, { slots }) {
    const cm = getClassMap()
    const { t } = useTranslation()
    const dragging = ref(false)
    const inputEl = ref<HTMLInputElement | null>(null)

    /**
     * Filters a file list into kept and rejected files, exactly as React does:
     * a file over `maxSize` is rejected, then a file matching neither the
     * accept extension nor the accept MIME token is rejected (`'*'` accepts
     * everything).
     *
     * @param raw - The files the user dropped or picked.
     * @returns The kept and rejected files.
     */
    function filter(raw: FileList | File[]): { kept: File[]; rejected: File[] } {
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
                a.trim() &&
                f.name.toLowerCase().endsWith(a.trim().toLowerCase().replace(/^\./, '.')),
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
    function openDialog(): void {
      inputEl.value?.click()
    }

    /**
     * The default copy React renders when no children are given.
     *
     * @returns The copy nodes.
     */
    function defaultCopy(): VNodeChild[] {
      const nodes: VNodeChild[] = [
        h(
          'p',
          { class: cm.cn(cm.textSize('sm'), cm.fontWeight('semibold')) },
          t('fileDropzone.dropHere', {}, { defaultValue: 'Drop files here or click to browse' }),
        ),
      ]
      if (props.accept)
        nodes.push(
          h(
            'p',
            { class: cm.cn(cm.textSize('xs'), cm.sp('mt', 1)) },
            t(
              'fileDropzone.accepts',
              { accept: props.accept },
              { defaultValue: 'Accepts: {{accept}}' },
            ),
          ),
        )
      return nodes
    }

    /**
     * The zone's children: the default slot (or the `children` prop) when
     * given, React's default copy otherwise.
     *
     * @returns The children to render.
     */
    function content(): VNodeChild[] {
      // An empty children list (a `v-for` over no rows) is absent, as React's
      // slot() treats it: the default copy renders.
      const supplied = toChildArray(
        slots.default ? slots.default() : props.children != null ? props.children : undefined,
      )
      return supplied.length > 0 ? supplied : defaultCopy()
    }

    /**
     * The drop surface's inline style — React's dashed drop region, whose
     * border thickens and whose fill tints on drag-over. The colours are theme
     * tokens; no ClassMap tier is a dashed drop region.
     *
     * @returns The style object.
     */
    function zoneStyle(): Record<string, string> {
      return dragging.value
        ? {
            border: '2px dashed var(--mol-color-primary, #3366ff)',
            borderRadius: '12px',
            minHeight: '140px',
            background: 'color-mix(in srgb, var(--mol-color-primary, #3366ff) 6%, transparent)',
          }
        : {
            border: '2px dashed var(--mol-color-border, rgba(128,128,128,0.35))',
            borderRadius: '12px',
            minHeight: '140px',
          }
    }

    return (): VNode =>
      h(
        'div',
        {
          onDragover: (event: DragEvent) => {
            if (!props.disabled) {
              event.preventDefault()
              dragging.value = true
            }
          },
          onDragleave: () => {
            dragging.value = false
          },
          onDrop: (event: DragEvent) => {
            event.preventDefault()
            dragging.value = false
            if (!props.disabled && event.dataTransfer?.files) dispatch(event.dataTransfer.files)
          },
          onClick: () => {
            if (!props.disabled) openDialog()
          },
          onKeydown: (event: KeyboardEvent) => {
            // role="button" gets no native keyboard activation — wire
            // Enter/Space to open the file dialog so keyboard users can
            // browse (preventDefault stops Space from scrolling the page).
            if (props.disabled) return
            if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
              event.preventDefault()
              openDialog()
            }
          },
          'data-mol-id': 'file-dropzone',
          role: 'button',
          tabindex: 0,
          'aria-disabled': props.disabled,
          class: cm.cn(
            cm.flex({ direction: 'col', align: 'center', justify: 'center' }),
            cm.sp('p', 6),
            cm.textCenter,
            !props.disabled ? cm.cursorPointer : undefined,
            props.className,
          ),
          style: zoneStyle(),
        },
        [
          h('input', {
            ref: inputEl,
            type: 'file',
            accept: props.accept,
            multiple: props.multiple ? '' : undefined,
            disabled: props.disabled ? '' : undefined,
            onChange: (event: Event) => {
              const files = (event.target as HTMLInputElement).files
              if (files) dispatch(files)
            },
            style: { display: 'none' },
          }),
          ...content(),
        ],
      )
  },
})
