/**
 * CheckField: a native checkbox or controlled radio.
 *
 * @module
 */

import {
  type ReactElement,
  type Ref,
  useCallback,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { type GestureResponderEvent, Pressable as NativePressable, type View } from 'react-native'

import type { KitCheckFieldProps } from '@molecule/app-react-ui-kit-components'
import { type CheckFieldHandle, getClassMap } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { fieldEvent } from './events.js'
import { registerInline } from './flow.js'
import { DisabledScope, FormScope, useFieldValue, useFormRegistration } from './form.js'
import { useGridCell } from './grid.js'
import {
  dataAttributes,
  ElementScope,
  replacedFlow,
  splitClasses,
  useInheritedText,
  useLineStart,
  useTagClasses,
} from './inherited.js'
import { useLabelable } from './labels.js'
import { activatePress, pressProps } from './press.js'
import { nativeStyle } from './style.js'
import { Path, Svg } from './Svg.js'

/**
 * Draws the check state, handles activation, and contributes a successful control to the form.
 * An accessibility-hidden control retains its handle and registration without drawing a view.
 *
 * @param props - The checkbox or radio's props and ref.
 * @returns The visible control, or null for a hidden one.
 */
export function CheckField(
  props: KitCheckFieldProps & { ref?: Ref<CheckFieldHandle> },
): ReactElement | null {
  const {
    as,
    type,
    name,
    checked,
    defaultChecked,
    indeterminate,
    className,
    style,
    webStyle,
    required,
    onChange,
    onClick,
    onCheckedChange,
    onFocus,
    onBlur,
    tabIndex,
    ref,
  } = props
  const value = props.value ?? 'on'
  const form = useContext(FormScope)
  const fieldsetDisabled = useContext(DisabledScope)
  const disabled = props.disabled || fieldsetDisabled
  const hidden = props['aria-hidden'] === true || props['aria-hidden'] === 'true'
  const field = useFieldValue(checked, defaultChecked ?? false)
  const [mixed, setMixed] = useState(indeterminate ?? false)
  useLayoutEffect(() => {
    setMixed(indeterminate ?? false)
  }, [indeterminate])
  const view = useRef<View>(null)
  const focus = useCallback((): void => {
    if (!disabled && !hidden) view.current?.focus()
  }, [disabled, hidden])
  const click = (event?: GestureResponderEvent): void => {
    if (disabled) return
    activatePress(
      onClick,
      () => {
        const next = !field.read()
        if (type === 'radio' && !next) return
        setMixed(false)
        field.change(next, () => {
          onChange?.(fieldEvent({ checked: next, value, name: name ?? '', type }))
          onCheckedChange?.(next)
        })
      },
      event,
    )
  }
  useImperativeHandle(ref, () => ({
    focus,
    blur: () => view.current?.blur(),
    click: () => click(),
    get checked(): boolean {
      return field.read()
    },
  }))
  const label = useLabelable(props.id, hidden ? undefined : () => click())
  useFormRegistration(form?.fields, {
    entries: () => (name && !disabled && field.read() ? [[name, value]] : []),
    valid: () =>
      disabled ||
      !required ||
      field.read() ||
      (type === 'radio' && !!name && form?.hasCheckedRadio(name) === true),
    checkedRadio: () => (type === 'radio' && field.read() ? name : undefined),
    reset: field.reset,
    focus: props.formFocus ?? focus,
  })
  // RN View.focus is available to focusable hosts, and hidden controls never acquire a host.
  useLayoutEffect(() => {
    if (props.autoFocus) focus()
  }, [props.autoFocus, focus])

  const classes = useTagClasses(className, as)
  const marked = mixed || field.displayed
  const split = splitClasses(classes, useInheritedText(), {
    ...dataAttributes(props),
    state: marked ? 'checked' : 'unchecked',
  })
  const lineStyle = useLineStart(replacedFlow(className, as))
  const gridStyle = useGridCell()
  if (hidden) return null

  const mark = marked
    ? getClassMap().checkFieldMark?.(
        type === 'radio' ? 'radio' : mixed ? 'mixed' : 'checked',
        classes,
      )
    : undefined
  return (
    <ElementScope split={split}>
      <NativePressable
        {...nativeAccessibility({
          ...props,
          role: props.role ?? type,
          'aria-checked': props['aria-checked'] ?? (mixed ? 'mixed' : field.displayed),
          'aria-disabled': disabled || props['aria-disabled'],
          'aria-label': props['aria-label'] ?? label,
        })}
        ref={view}
        className={split.view || undefined}
        style={[nativeStyle(style, webStyle), lineStyle, gridStyle]}
        disabled={disabled}
        {...pressProps({ onFocus, onBlur, tabIndex })}
        onPress={click}
      >
        {mark && (
          <Svg
            className={mark.className}
            width="100%"
            height="100%"
            viewBox="0 0 16 16"
            aria-hidden
          >
            <Path d={mark.path} fill="currentColor" />
          </Svg>
        )}
      </NativePressable>
    </ElementScope>
  )
}

registerInline(CheckField, (props) => replacedFlow(props.className, 'input'))
