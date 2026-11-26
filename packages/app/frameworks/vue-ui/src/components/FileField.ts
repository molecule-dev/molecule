/**
 * A browser file picker and drop target.
 *
 * @module
 */

import { type ComponentObjectPropsOptions, defineComponent, h, shallowRef, type VNode } from 'vue'

import { createBrowserFileInput, fromBrowserFile, type PickedFile } from '@molecule/app-filesystem'
import type { FileFieldHandle, FileFieldProps } from '@molecule/app-ui'

/** Renders a browse target and exposes `pick()` through the caller's template ref. */
export const FileField = defineComponent({
  name: 'FileField',
  inheritAttrs: false,
  expose: ['pick'],
  props: {
    accept: String,
    className: String,
    disabled: { type: Boolean, default: undefined },
    maxSize: Number,
    multiple: Boolean,
  } satisfies ComponentObjectPropsOptions<
    Pick<FileFieldProps, 'accept' | 'className' | 'disabled' | 'maxSize' | 'multiple'>
  >,
  emits: {
    valueChange: (_files: readonly PickedFile[]) => true,
    rejected: (_files: readonly PickedFile[]) => true,
    pickError: (_error: Error) => true,
  },
  setup(props, { attrs, emit, slots }) {
    const input = shallowRef<HTMLInputElement>()
    const handlers = createBrowserFileInput(
      () => input.value,
      () => ({
        ...props,
        onFiles: (files) => emit('valueChange', files),
        onRejected: (files) => emit('rejected', files),
        onPickError: (error) => emit('pickError', error),
      }),
      fromBrowserFile,
    )

    const pick: FileFieldHandle['pick'] = () =>
      handlers.onClick({ target: null, defaultPrevented: false })
    const renderField = (): VNode =>
      h(
        'div',
        {
          'data-mol-id': 'file-field',
          ...attrs,
          role: attrs.role ?? 'button',
          class: props.className ?? attrs.class,
          tabindex: props.disabled ? -1 : 0,
          'aria-disabled': props.disabled,
          onClick: handlers.onClick,
          onKeydown: handlers.onKeyDown,
          onDragover: handlers.onDragOver,
          onDrop: handlers.onDrop,
        },
        [
          h('input', {
            ref: input,
            type: 'file',
            hidden: true,
            accept: props.accept,
            multiple: props.multiple,
            disabled: props.disabled,
            onChange: handlers.onChange,
          }),
          slots.default?.(),
        ],
      )
    return { pick, renderField }
  },
  render() {
    return this.renderField()
  },
})
