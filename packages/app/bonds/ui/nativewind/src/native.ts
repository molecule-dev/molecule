/**
 * The ClassMap on React Native (Metro resolves this module through the `react-native` export
 * condition): the same exports, with react-native-svg's canvases styled by their classes.
 *
 * nativewind styles a component from its `className` only when the component is registered with
 * it. React Native's own components are; react-native-svg's are not, so an icon drawn with the
 * text classes in effect would lose their colour (`currentColor`) and size on a device. The
 * native elements draw every canvas with react-native-svg's `Svg` or `SvgXml`, and both are
 * registered here, when an app first loads its ClassMap.
 *
 * @module
 */

import { cssInterop } from 'nativewind'
import { createElement, isValidElement, type ReactElement } from 'react'
import { Svg, SvgXml } from 'react-native-svg'

import type { UIClassMap } from '@molecule/app-ui'

import { classMap as baseClassMap } from './index.js'

cssInterop(Svg, { className: 'style' })
cssInterop(SvgXml, { className: 'style' })

/** Gives a drawing the concrete colour NativeWind computed from its inherited text classes. */
function NativeTextColor({
  style,
  render,
}: {
  style?: { color?: string }
  render: (color: string | undefined) => unknown
}): ReactElement | null {
  const drawing = render(style?.color)
  return isValidElement(drawing) ? drawing : null
}

const StyledTextColor = cssInterop(NativeTextColor, { className: 'style' })

/** Native ClassMap with the styling runtime's live text colour available to the SVG painter. */
export const classMap: UIClassMap = {
  ...baseClassMap,
  renderNativeTextColor: (classes, render) =>
    createElement(StyledTextColor, { className: classes, render }),
}

export * from './index.js'
