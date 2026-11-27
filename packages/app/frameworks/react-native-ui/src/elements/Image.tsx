/**
 * Image: a picture.
 *
 * @module
 */

import type { ReactElement } from 'react'
import { Image as NativeImage } from 'react-native'

import type { ImageProps } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { registerInline } from './flow.js'
import { useGridCell } from './grid.js'
import { replacedFlow } from './inherited.js'
import { useNativeRef } from './ref.js'
import type { ElementRefProps } from './types.js'

/** React Native's resize mode for a CSS `object-fit`. */
const RESIZE = { cover: 'cover', contain: 'contain', fill: 'stretch', none: 'center' } as const

/**
 * An image: a native `Image` with `alt` as its accessibility label; an empty `alt` hides a
 * decorative image from assistive technology.
 *
 * @param props - See {@link ImageProps}.
 * @returns The element.
 */
export function Image(props: ImageProps & ElementRefProps): ReactElement {
  const { src, alt, width, height, className, style, onLoad, onError, ref } = props
  const { objectFit, ...box } = style ?? {}
  return (
    <NativeImage
      {...nativeAccessibility({
        ...props,
        'aria-label': alt || props['aria-label'],
        'aria-hidden': alt === '' ? true : props['aria-hidden'],
      })}
      ref={useNativeRef<NativeImage>(ref)}
      source={{ uri: src }}
      className={className || undefined}
      style={[{ width, height }, box, useGridCell()]}
      resizeMode={objectFit ? RESIZE[objectFit] : undefined}
      onLoad={onLoad ? (): void => onLoad() : undefined}
      onError={onError ? (): void => onError() : undefined}
    />
  )
}

registerInline(Image, (props) => replacedFlow(props.className, 'img'))
