/**
 * Image: a picture.
 *
 * @module
 */

import { createElement, type ReactElement } from 'react'

import type { ImageProps } from '@molecule/app-ui'

import { useElementRef } from './ref.js'
import type { ElementRefProps } from './types.js'

/**
 * An image: renders exactly an `<img>` with the props given. On React Native it is an `Image`
 * with `alt` as its accessibility label.
 *
 * @param props - See {@link ImageProps}.
 * @returns The element.
 */
export function Image({
  style,
  webStyle,
  ref,
  ...props
}: ImageProps & ElementRefProps): ReactElement {
  return createElement('img', {
    ...props,
    ref: useElementRef(ref),
    style: style || webStyle ? { ...style, ...webStyle } : undefined,
  })
}
