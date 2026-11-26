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

import { createBrowserFileInput } from '@molecule/app-filesystem'
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

    const handlers = createBrowserFileInput(
      () => inputEl.value,
      () => props,
      (file) => file,
    )

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
            if (handlers.onDragOver(event)) dragging.value = true
          },
          onDragleave: () => {
            dragging.value = false
          },
          onDrop: (event: DragEvent) => {
            dragging.value = false
            handlers.onDrop(event)
          },
          onClick: handlers.onClick,
          onKeydown: handlers.onKeyDown,
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
            onChange: handlers.onChange,
            style: { display: 'none' },
          }),
          ...content(),
        ],
      )
  },
})
