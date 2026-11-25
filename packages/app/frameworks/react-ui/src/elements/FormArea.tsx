/**
 * FormArea: a form and its successful controls.
 *
 * @module
 */

import { createElement, type FormEvent, type ReactElement, type Ref } from 'react'

import type { FormAreaHandle, FormAreaProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'
import type { ElementNode } from './types.js'

/**
 * Renders a form and supplies its successful controls to the submit handler.
 *
 * @param props - The form's props and ref.
 * @returns The form.
 */
export function FormArea({
  as,
  children,
  ref,
  ...props
}: FormAreaProps<ElementNode> & { ref?: Ref<FormAreaHandle> }): ReactElement {
  const { onSubmit } = props
  return createElement(
    as,
    webElementAttributes(props, {
      ref: useElementRef<HTMLFormElement>(ref),
      onSubmit: onSubmit
        ? (event: FormEvent<HTMLFormElement>): void => {
            onSubmit(event, Array.from(new FormData(event.currentTarget)))
          }
        : undefined,
    }),
    children,
  )
}
