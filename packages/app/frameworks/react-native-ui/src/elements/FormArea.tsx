/**
 * FormArea: a native scope for grouping, validating and submitting controls.
 *
 * @module
 */

import {
  type ReactElement,
  type Ref,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { View } from 'react-native'

import type { FormAreaHandle, FormAreaProps } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { createFormScope, FormScope } from './form.js'
import { useGridCell } from './grid.js'
import {
  dataAttributes,
  ElementScope,
  layoutChildren,
  splitClasses,
  useInheritedText,
  useTagClasses,
} from './inherited.js'
import { createLabelDirectory, FormLabels } from './labels.js'
import { nativeStyle } from './style.js'
import type { ElementNode } from './types.js'

/**
 * Draws a form container and supplies its submit, reset and scoped label associations.
 *
 * @param props - The form's props and ref.
 * @returns The form and its content.
 */
export function FormArea(
  props: FormAreaProps<ElementNode> & { ref?: Ref<FormAreaHandle> },
): ReactElement {
  const { as, action, onSubmit, className, style, webStyle, children, ref } = props
  const latest = useRef<FormAreaProps>(props)
  useLayoutEffect(() => {
    latest.current = props
  }, [props])
  const [form] = useState(() => createFormScope(() => latest.current))
  const [labels] = useState(createLabelDirectory)
  const view = useRef<View>(null)
  useImperativeHandle(
    ref,
    () => ({
      focus: () => view.current?.focus(),
      blur: () => view.current?.blur(),
      requestSubmit: form.submit,
    }),
    [form],
  )
  useEffect(() => {
    if (typeof __DEV__ !== 'undefined' && __DEV__ && action !== undefined && !onSubmit) {
      console.error('FormArea requires onSubmit to handle an action on React Native.')
    }
  }, [action, onSubmit])
  const split = splitClasses(
    useTagClasses(className, as),
    useInheritedText(),
    dataAttributes(props),
  )

  return (
    <FormScope.Provider value={form}>
      <FormLabels.Provider value={labels}>
        <ElementScope split={split}>
          <View
            {...nativeAccessibility(props, as)}
            ref={view}
            className={split.view || undefined}
            style={[nativeStyle(style, webStyle), useGridCell()]}
          >
            {layoutChildren(children, split)}
          </View>
        </ElementScope>
      </FormLabels.Provider>
    </FormScope.Provider>
  )
}
