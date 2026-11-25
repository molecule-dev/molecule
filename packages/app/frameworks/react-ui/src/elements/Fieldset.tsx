/**
 * Fieldset: a group of form controls.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import type { FieldsetProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import { webElementAttributes } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * Renders a fieldset, which can disable all its controls together.
 *
 * @param props - The fieldset's props and ref.
 * @returns The fieldset.
 */
export function Fieldset({
  as,
  children,
  ref,
  ...props
}: FieldsetProps<ElementNode> & ElementRefProps): ReactElement {
  return createElement(
    as,
    { ...webElementAttributes(props), ref: useElementRef<HTMLFieldSetElement>(ref) },
    children,
  )
}
