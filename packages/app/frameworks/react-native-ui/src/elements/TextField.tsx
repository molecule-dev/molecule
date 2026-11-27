/**
 * TextField: a text input or text area.
 *
 * @module
 */

import { type ReactElement, useCallback, useContext, useRef, useState } from 'react'
import {
  type NativeSyntheticEvent,
  Platform,
  TextInput,
  type TextInputContentSizeChangeEventData,
  type TextInputKeyPressEventData,
  type TextInputProps as NativeTextInputProps,
  useWindowDimensions,
} from 'react-native'

import type { NativeClassSplit, TextFieldProps } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { fieldEvent, focusEvent, keyboardEvent, mouseEvent } from './events.js'
import { validBoundedField } from './fieldBounds.js'
import { registerInline } from './flow.js'
import { DisabledScope, FormScope, useFieldValue, useFormRegistration } from './form.js'
import { atBreakpoint, useGridCell } from './grid.js'
import {
  dataAttributes,
  replacedFlow,
  splitClasses,
  textElementClasses,
  useInheritedText,
  useTagClasses,
} from './inherited.js'
import { useLabelable } from './labels.js'
import { nativePasteProps, PasteScope } from './paste.js'
import { useNativeRef } from './ref.js'
import { nativeStyle } from './style.js'
import type { ElementRefProps } from './types.js'

/** The on-screen keyboard a web input type brings up. */
const INPUT_MODE: Readonly<
  Record<NonNullable<TextFieldProps['type']>, TextFieldProps['inputMode']>
> = {
  text: undefined,
  password: undefined,
  email: 'email',
  search: 'search',
  number: 'decimal',
  tel: 'tel',
  url: 'url',
  // A device takes a date or a time as text in the web's value format; a picker is not drawn.
  date: undefined,
  time: undefined,
  'datetime-local': undefined,
}

/** The `autoComplete` values a device's text field takes (the web's, with the device's own names). */
const AUTO_COMPLETE: ReadonlySet<string> = new Set<
  NonNullable<NativeTextInputProps['autoComplete']>
>([
  'additional-name',
  'address-line1',
  'address-line2',
  'cc-csc',
  'cc-exp',
  'cc-exp-month',
  'cc-exp-year',
  'cc-number',
  'cc-name',
  'cc-given-name',
  'cc-family-name',
  'cc-type',
  'country',
  'current-password',
  'email',
  'family-name',
  'given-name',
  'honorific-prefix',
  'honorific-suffix',
  'name',
  'new-password',
  'nickname',
  'one-time-code',
  'organization',
  'organization-title',
  'postal-code',
  'street-address',
  'tel',
  'tel-country-code',
  'tel-national',
  'url',
  'username',
  'off',
])

/**
 * Whether a web `autoComplete` value is one a device takes.
 *
 * @param value - The web value.
 * @returns Whether a device's text field takes it.
 */
function isNativeAutoComplete(
  value: string | undefined,
): value is NonNullable<NativeTextInputProps['autoComplete']> {
  return value !== undefined && AUTO_COMPLETE.has(value)
}

/**
 * A text area that grows with its text (`autoGrow`): the height is the text's height, at least
 * `minRows` and at most `maxRows` lines at the current window width.
 *
 * @param autoGrow - The line counts, or `undefined` for a field that does not grow.
 * @param lineHeights - The field's line heights in pixels by breakpoint.
 * @returns The height style and the content-size handler that measures the text.
 */
function useAutoGrow(
  autoGrow: TextFieldProps['autoGrow'],
  lineHeights: NativeClassSplit['lineHeight'],
): {
  style: { height: number; minHeight: number; maxHeight?: number } | undefined
  onContentSizeChange:
    ((event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => void) | undefined
} {
  const [content, setContent] = useState(0)
  const { width } = useWindowDimensions()
  if (!autoGrow) return { style: undefined, onContentSizeChange: undefined }
  // 16px on a 1.5 line is the web default when a ClassMap supplies no metrics.
  const line = (lineHeights && atBreakpoint(lineHeights, width)) ?? 24
  const min = autoGrow.minRows * line
  const max = autoGrow.maxRows === undefined ? Infinity : autoGrow.maxRows * line
  return {
    style: {
      height: Math.min(Math.max(content, min), max),
      minHeight: Math.min(min, max),
      ...(autoGrow.maxRows === undefined ? {} : { maxHeight: max }),
    },
    onContentSizeChange: (event) => setContent(event.nativeEvent.contentSize.height),
  }
}

/** The HTML email input grammar for a single address, including single-label domains. */
const EMAIL =
  /^[a-z0-9.!#$%&'*+/=?^`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i
const SCHEME = /^[a-z][a-z0-9+.-]*:/i
const NETWORK_AUTHORITY = /^(?:https?|ftp|wss?):[/\\]*([^/?#\\]*)/i
const HOST_AND_PORT = /^(?:\[[0-9a-f:.]+\]|[^\s<>^|:[\]]+)(?::(\d*))?$/i

/** Checks an absolute URL, including the authority checks missing from older RN URL constructors. */
function validUrl(text: string): boolean {
  if (!SCHEME.test(text)) return false
  const authority = NETWORK_AUTHORITY.exec(text)?.[1]
  if (authority !== undefined) {
    const host = HOST_AND_PORT.exec(authority.slice(authority.lastIndexOf('@') + 1))
    if (!host || Number(host[1] ?? 0) > 65535) return false
  }
  try {
    // A fragment cannot supply the scheme or host. Older React Native URL constructors
    // assume a URL with a fragment always has a network host.
    new URL(text.split('#', 1)[0])
    return true
  } catch (_error) {
    // The URL constructor throws for text that is not a URL; that is the invalid answer, so the
    // error carries nothing to report.
    return false
  }
}

/** Removes the characters the browser strips from single-line input values. */
function formText(text: string, singleLine: boolean, type: TextFieldProps['type']): string {
  if (!singleLine) return text
  const line = text.replace(/[\r\n]/g, '')
  return type === 'url' || type === 'email' ? line.replace(/^[\t\f ]+|[\t\f ]+$/g, '') : line
}

/**
 * A text field: a native `TextInput`, multi-line for `textarea`. `onValueChange` receives the new
 * text; `onChange` and `onInput` receive an event whose target's `value` is the new text.
 *
 * Each key the device's keyboard sends fires `onKeyDown`, `onKeyPress` and `onKeyUp` in that
 * order, before the text changes; a handler that calls `preventDefault()` on the first two keeps
 * the change from reaching `onChange`, `onInput` and `onValueChange`, as on the web. `onClick`
 * fires on a press, `title` is the accessibility hint, and `tabIndex` decides whether the field
 * takes keyboard focus. A device has no hover or double click on a text field
 * (`onMouseEnter`, `onMouseLeave`, `onDoubleClick`) and no character columns or line-wrap modes
 * (`cols`, `wrap`). Inside a form, Return in a single-line field can submit it.
 *
 * @param props - See {@link TextFieldProps}.
 * @returns The element.
 */
export function TextField(props: TextFieldProps & ElementRefProps): ReactElement {
  const {
    as,
    type,
    inputMode,
    value,
    defaultValue,
    placeholder,
    readOnly,
    name,
    required,
    maxLength,
    rows,
    autoGrow,
    autoFocus,
    autoComplete,
    spellCheck,
    autoCorrect,
    enterKeyHint,
    selectTextOnFocus,
    onPasteText,
    title,
    tabIndex,
    className,
    style,
    webStyle,
    onChange,
    onValueChange,
    onInput,
    onFocus,
    onBlur,
    onClick,
    onKeyDown,
    onKeyPress,
    onKeyUp,
    ref,
  } = props
  const form = useContext(FormScope)
  const parentPaste = useContext(PasteScope)
  const fieldsetDisabled = useContext(DisabledScope)
  const disabled = props.disabled || fieldsetDisabled
  const singleLine = as === 'input'
  const split = splitClasses(
    useTagClasses(className, props.as),
    useInheritedText(),
    dataAttributes(props),
  )
  const grow = useAutoGrow(as === 'textarea' ? autoGrow : undefined, split.lineHeight)
  const field = useFieldValue(value, defaultValue ?? '')
  const read = field.read
  const node = useRef<TextInput>(null)
  const forward = useNativeRef<TextInput>(ref)
  const setNode = useCallback(
    (instance: TextInput | null): void => {
      node.current = instance
      if (instance && forward) {
        // Keep the original host for the kit's measurement and focus operations.
        Object.assign(instance, {
          select(): void {
            if (node.current === instance) instance.setSelection(0, read().length)
          },
        })
      }
      forward?.(instance)
    },
    [forward, read],
  )
  const focus = (): void => {
    if (!disabled) node.current?.focus()
  }
  const label = useLabelable(props.id, focus)
  const readEntry = (): string => formText(field.read(), singleLine, type)
  useFormRegistration(form?.fields, {
    entries: () => (name && !disabled ? [[name, readEntry()]] : []),
    valid: () => {
      if (disabled || readOnly) return true
      const text = readEntry()
      if (!text) return !required
      if (singleLine && type === 'email') return EMAIL.test(text)
      if (singleLine && type === 'url') return validUrl(text)
      return !singleLine || validBoundedField(props, text)
    },
    focus,
    reset: field.reset,
    singleLine,
  })
  // A key whose handler prevented its default never reaches the text handlers (the web inserts
  // nothing, so no input or change event fires).
  const prevented = useRef(false)
  const hasKeys = onKeyDown || onKeyPress || onKeyUp
  const handleKey = hasKeys
    ? (event: NativeSyntheticEvent<TextInputKeyPressEventData>): void => {
        const { key } = event.nativeEvent
        const down = keyboardEvent(key)
        onKeyDown?.(down)
        const press = keyboardEvent(key)
        onKeyPress?.(press)
        onKeyUp?.(keyboardEvent(key))
        prevented.current = down.defaultPrevented || press.defaultPrevented
        // The key's own text change arrives in the same turn; a key that changes nothing (Enter
        // in a one-line field) must not swallow the next change (a paste).
        if (prevented.current)
          setTimeout(() => {
            prevented.current = false
          }, 0)
      }
    : undefined
  const handleText = (text: string): void => {
    if (disabled || readOnly) return
    if (prevented.current) {
      prevented.current = false
      return
    }
    field.change(text, () => {
      onInput?.(fieldEvent({ value: text, name, type }))
      onChange?.(fieldEvent({ value: text, name, type }))
      onValueChange?.(text)
    })
  }
  // NativeWind reads the disabled prop; the device's TextInput reads editable.
  const nativeState = { disabled: disabled || undefined, editable: !readOnly && !disabled }
  const submitOnReturn = form && singleLine && !disabled
  return (
    <TextInput
      {...nativeAccessibility({
        ...props,
        'aria-label': props['aria-label'] ?? label,
        'aria-disabled': disabled || props['aria-disabled'],
      })}
      ref={setNode}
      className={textElementClasses(split)}
      style={[nativeStyle(style, webStyle), useGridCell(), grow.style]}
      multiline={as === 'textarea'}
      numberOfLines={as === 'textarea' ? rows : undefined}
      secureTextEntry={type === 'password'}
      inputMode={inputMode ?? (type ? INPUT_MODE[type] : undefined)}
      value={field.displayed}
      placeholder={placeholder}
      {...nativeState}
      {...nativePasteProps(
        nativeState.editable ? (onPasteText ?? parentPaste?.handlePaste) : undefined,
      )}
      maxLength={maxLength}
      autoFocus={disabled ? false : autoFocus}
      autoComplete={isNativeAutoComplete(autoComplete) ? autoComplete : undefined}
      spellCheck={Platform.OS === 'ios' ? spellCheck : undefined}
      autoCorrect={autoCorrect === undefined ? undefined : autoCorrect === 'on'}
      enterKeyHint={
        (enterKeyHint === 'previous' && Platform.OS !== 'android') ||
        (enterKeyHint === 'enter' && Platform.OS !== 'ios')
          ? undefined
          : enterKeyHint
      }
      selectTextOnFocus={selectTextOnFocus}
      accessibilityHint={title}
      tabIndex={tabIndex === undefined ? undefined : tabIndex >= 0 ? 0 : -1}
      onContentSizeChange={grow.onContentSizeChange}
      onChangeText={handleText}
      onKeyPress={handleKey}
      submitBehavior={submitOnReturn ? 'submit' : undefined}
      onSubmitEditing={
        submitOnReturn
          ? () => {
              if (!prevented.current) form.submitImplicitly()
            }
          : undefined
      }
      onPress={onClick ? (event) => onClick(mouseEvent(event)) : undefined}
      onFocus={onFocus ? () => onFocus(focusEvent()) : undefined}
      onBlur={onBlur ? () => onBlur(focusEvent()) : undefined}
    />
  )
}

// A field is an inline box, as `input` and `textarea` are on the web, unless a display class makes
// it a block (`flex`, `block`): then it takes a line of its own, with no line box around it.
registerInline(TextField, (props) => replacedFlow(props.className, String(props.as ?? 'input')))
