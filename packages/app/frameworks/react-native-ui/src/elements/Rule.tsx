/**
 * Rule: a native horizontal thematic break.
 *
 * @module
 */

import type { ReactElement } from 'react'
import { View } from 'react-native'

import { getClassMap, type RuleProps } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { registerInline } from './flow.js'
import { useGridCell } from './grid.js'
import { dataAttributes, splitClasses, useTagClasses } from './inherited.js'
import { useNativeRef } from './ref.js'
import { nativeStyle } from './style.js'
import type { ElementRefProps } from './types.js'

/** Draws a theme-colored top border with the theme's vertical spacing. */
export function Rule(props: RuleProps & ElementRefProps): ReactElement {
  const cm = getClassMap()
  const className = cm.cn(cm.borderT, cm.sp('my', 1), useTagClasses(props.className, props.as))
  const { view } = splitClasses(className, '', dataAttributes(props))
  const accessibility = nativeAccessibility(props)
  const decorative =
    !!accessibility['aria-hidden'] || props.role === 'presentation' || props.role === 'none'
  return (
    <View
      {...accessibility}
      ref={useNativeRef<View>(props.ref)}
      accessible={!decorative}
      accessibilityElementsHidden={decorative || undefined}
      importantForAccessibility={decorative ? 'no-hide-descendants' : undefined}
      role={decorative ? undefined : (accessibility.role ?? 'separator')}
      className={view || undefined}
      style={[{ alignSelf: 'stretch' }, nativeStyle(props.style, props.webStyle), useGridCell()]}
    />
  )
}

registerInline(Rule, () => null)
