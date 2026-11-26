/**
 * A browser file picker and drop target.
 *
 * @module
 */

import { type JSX, type Ref, splitProps } from 'solid-js'

import { createBrowserFileInput, fromBrowserFile } from '@molecule/app-filesystem'
import type { FileFieldHandle, FileFieldProps } from '@molecule/app-ui'

import { toStyleProps } from '../style.js'

/**
 * Renders a browse target and passes the chooser handle to the caller's `ref`.
 *
 * @param props - The field props.
 * @returns The rendered field.
 */
export function FileField(
  props: FileFieldProps<JSX.Element> & { ref?: Ref<FileFieldHandle> },
): JSX.Element {
  const [field, attrs] = splitProps(props, [
    'accept',
    'children',
    'className',
    'disabled',
    'maxSize',
    'multiple',
    'onPickError',
    'onRejected',
    'onValueChange',
    'ref',
    'role',
    'style',
    'webStyle',
  ])
  let input: HTMLInputElement | undefined
  const handlers = createBrowserFileInput(
    () => input,
    () => ({
      accept: field.accept,
      disabled: field.disabled,
      maxSize: field.maxSize,
      multiple: field.multiple,
      onFiles: field.onValueChange,
      onPickError: field.onPickError,
      onRejected: field.onRejected,
    }),
    fromBrowserFile,
  )
  const handle: FileFieldHandle = {
    pick: () => handlers.onClick({ target: null, defaultPrevented: false }),
  }

  return (
    <div
      data-mol-id="file-field"
      {...attrs}
      {...{ 'attr:role': field.role ?? 'button' }}
      class={field.className}
      style={toStyleProps({ ...field.style, ...field.webStyle })}
      tabIndex={field.disabled ? -1 : 0}
      aria-disabled={field.disabled}
      onClick={handlers.onClick}
      onKeyDown={handlers.onKeyDown}
      onDragOver={handlers.onDragOver}
      onDrop={handlers.onDrop}
    >
      <input
        ref={(element) => {
          input = element
          if (typeof field.ref === 'function') field.ref(handle)
        }}
        type="file"
        hidden
        accept={field.accept}
        multiple={field.multiple}
        disabled={field.disabled}
        onChange={handlers.onChange}
      />
      {field.children}
    </div>
  )
}
