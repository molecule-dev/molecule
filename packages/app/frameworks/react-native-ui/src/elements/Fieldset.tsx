/**
 * Fieldset: a native disabled scope with an optional layout box.
 *
 * @module
 */

import { type ReactElement, useContext } from 'react'
import { View } from 'react-native'

import type { FieldsetProps } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { registerContents } from './flow.js'
import { DisabledScope } from './form.js'
import { useGridCell } from './grid.js'
import {
  dataAttributes,
  ElementScope,
  layoutChildren,
  splitClasses,
  useInheritedText,
  useTagClasses,
  wrapStrings,
} from './inherited.js'
import { useNativeRef } from './ref.js'
import { nativeStyle } from './style.js'
import type { ElementNode, ElementRefProps } from './types.js'

/**
 * Disables descendant controls, with no view when its classes set display contents.
 *
 * @param props - The fieldset's props and ref.
 * @returns The fieldset and its content.
 */
export function Fieldset(props: FieldsetProps<ElementNode> & ElementRefProps): ReactElement {
  const { as, className, style, webStyle, children, ref } = props
  const parentDisabled = useContext(DisabledScope)
  const disabled = parentDisabled || props.disabled === true
  const split = splitClasses(
    useTagClasses(className, as),
    useInheritedText(),
    dataAttributes(props),
  )
  const nativeRef = useNativeRef<View>(ref)
  const gridCell = useGridCell()

  return (
    <DisabledScope.Provider value={disabled}>
      <ElementScope split={split}>
        {split.display === 'contents' ? (
          wrapStrings(children, split.text)
        ) : (
          <View
            {...nativeAccessibility(
              { ...props, 'aria-disabled': disabled || props['aria-disabled'] },
              as,
            )}
            ref={nativeRef}
            className={split.view || undefined}
            style={[nativeStyle(style, webStyle), gridCell]}
          >
            {layoutChildren(children, split)}
          </View>
        )}
      </ElementScope>
    </DisabledScope.Provider>
  )
}

registerContents(Fieldset, (props) => {
  const className = typeof props.className === 'string' ? props.className : undefined
  return splitClasses(className, '', dataAttributes(props)).display === 'contents'
})
