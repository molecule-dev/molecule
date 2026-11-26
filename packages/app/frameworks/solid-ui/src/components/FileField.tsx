/**
 * A browser file picker and drop target.
 *
 * @module
 */

import { type JSX, splitProps } from 'solid-js'

import { createBrowserFileInput, fromBrowserFile } from '@molecule/app-filesystem'
import type { FileFieldProps } from '@molecule/app-ui'

/**
 * Renders one focusable target and delivers portable file selections.
 *
 * @param props - The field props.
 * @returns The rendered field.
 */
export function FileField(props: FileFieldProps<JSX.Element>): JSX.Element {
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
    'role',
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

  return (
    <div
      data-mol-id="file-field"
      {...attrs}
      {...{ 'attr:role': field.role ?? 'button' }}
      class={field.className}
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
