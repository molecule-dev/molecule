/**
 * SelectField: a native choice trigger and form control.
 *
 * @module
 */

import {
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { type GestureResponderEvent, Platform, Text as NativeText } from 'react-native'

import { useTranslation } from '@molecule/app-react'
import type { ElementHandle, SelectFieldProps } from '@molecule/app-ui'

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
import { useLabelable, useReferencedLabelText } from './labels.js'
import { activatePress, pressProps } from './press.js'
import { hasRangeKeyboardView } from './rangeKeyboard.js'
import { SelectAction, type SelectActionHandle } from './SelectAction.js'
import { SelectMenu } from './SelectMenu.js'
import {
  choicesForValue,
  reconcileChoices,
  type SelectChoice,
  selectRows,
} from './selectOptions.js'
import { nativeStyle } from './style.js'

/**
 * Draws a choice trigger, opens its native modal and registers its selection as one form field.
 */
export const SelectField = forwardRef<ElementHandle, SelectFieldProps>(
  function SelectField(props, ref) {
    const { id, name, options, value, required, autoFocus, onClick, onChange, onFocus, onBlur } =
      props
    const { t, formatNumber } = useTranslation()
    const form = useContext(FormScope)
    const fieldsetDisabled = useContext(DisabledScope)
    const disabled = fieldsetDisabled || props.disabled === true
    const multiple = props.multiple === true
    const { rows, choices } = useMemo(() => selectRows(options), [options])
    const [mountDefault] = useState(() => {
      const initial = props.defaultValue
      return typeof initial === 'string' ? initial : initial?.slice()
    })
    const controlled = useMemo(
      () => (value === undefined ? undefined : choicesForValue(choices, multiple, value)),
      [choices, multiple, value],
    )
    const reset = useMemo(
      () => choicesForValue(choices, multiple, mountDefault),
      [choices, mountDefault, multiple],
    )
    const field = useFieldValue(controlled, reset)
    const selected = reconcileChoices(choices, field.displayed, multiple)
    const read = (): readonly SelectChoice[] => reconcileChoices(choices, field.read(), multiple)
    useLayoutEffect(() => {
      if (controlled !== undefined) return
      const previous = field.displayed
      if (
        selected.length !== previous.length ||
        selected.some(
          (choice, index) =>
            choice.key !== previous[index].key ||
            choice.uniqueValue !== previous[index].uniqueValue,
        )
      ) {
        field.change(selected, () => undefined)
      }
    }, [controlled, field, selected])

    const trigger = useRef<SelectActionHandle>(null)
    const [keyboard] = useState(hasRangeKeyboardView)
    const [open, setOpen] = useState(false)
    const openNow = useRef(false)
    const restorePending = useRef(false)
    const visible = open && !disabled
    const dismiss = (): void => {
      if (!openNow.current) return
      openNow.current = false
      restorePending.current = !disabled
      setOpen(false)
    }
    const restore = useCallback(() => {
      if (!restorePending.current || openNow.current || disabled) return
      restorePending.current = false
      trigger.current?.focus(true)
    }, [disabled])
    useLayoutEffect(() => {
      if (disabled) {
        openNow.current = false
        restorePending.current = false
        if (open) setOpen(false)
      } else if (!open && restorePending.current && Platform.OS !== 'ios') {
        const frame = requestAnimationFrame(restore)
        return () => cancelAnimationFrame(frame)
      }
      return undefined
    }, [disabled, open, restore])
    useLayoutEffect(
      () => () => {
        openNow.current = false
        restorePending.current = false
      },
      [],
    )
    const activate = (event?: GestureResponderEvent): void => {
      if (disabled || openNow.current) return
      activatePress(
        onClick,
        () => {
          openNow.current = true
          restorePending.current = false
          setOpen(true)
        },
        event,
      )
    }
    const focus = (): void => {
      if (disabled) return
      if (openNow.current) dismiss()
      else trigger.current?.focus(true)
    }
    const blur = (): void => trigger.current?.blur()
    useImperativeHandle(ref, () => ({ focus, blur }))
    useLayoutEffect(() => {
      if (autoFocus && !disabled) trigger.current?.focus(true)
    }, [autoFocus, disabled])
    const label = useLabelable(id, () => activate())
    const referenceName = useReferencedLabelText(props['aria-labelledby'])
    const description = useReferencedLabelText(props['aria-describedby'])

    const snapshot = (selection: readonly SelectChoice[]): KitSelectSnapshot => ({
      id,
      name: name ?? '',
      type: multiple ? 'select-multiple' : 'select-one',
      multiple,
      value: selection[0]?.option.value ?? '',
      selectedIndex: selection[0]?.index ?? -1,
      selectedOptions: selection.map(({ option }) => ({
        value: option.value,
        label: option.label,
        disabled: option.disabled ?? false,
      })),
      focus,
      blur,
    })
    const choose = (choice: SelectChoice): void => {
      if (disabled || !openNow.current || choice.option.disabled) return
      const current = read()
      const alreadySelected = current.some((row) => row.key === choice.key)
      if (!multiple) {
        dismiss()
        if (alreadySelected) return
      }
      const next = multiple
        ? alreadySelected
          ? current.filter((row) => row.key !== choice.key)
          : [...current, choice].sort((a, b) => a.index - b.index)
        : [choice]
      field.change(next, () => {
        const changed = snapshot(next)
        onChange?.(fieldEvent(changed))
        if (props.multiple) props.onValueChange?.(next.map((row) => row.option.value))
        else props.onValueChange?.(changed.value)
      })
    }

    useFormRegistration(form?.fields, {
      entries: () =>
        !name || disabled
          ? []
          : read().flatMap(({ option }) => (option.disabled ? [] : [[name, option.value]])),
      valid: () => {
        if (disabled || !required) return true
        const selection = read()
        const first = selection[0]
        return (
          !!first && (multiple || first.index !== 0 || first.grouped || first.option.value !== '')
        )
      },
      focus,
      reset: field.reset,
    })

    const title = t('ui.select.title', undefined, { defaultValue: 'Select' })
    const display = multiple
      ? t(
          'ui.select.selectionCount',
          { count: formatNumber(selected.length) },
          { count: selected.length, defaultValue: '{{count}} selected' },
        )
      : (selected[0]?.option.label ??
        t('ui.select.placeholder', undefined, { defaultValue: 'Select…' }))
    const accessibleName =
      referenceName ?? props['aria-label'] ?? label ?? props.title ?? (name || title)
    const accessibility = nativeAccessibility({
      ...props,
      role: props.role ?? 'combobox',
      'aria-label': accessibleName,
      'aria-labelledby': referenceName ? undefined : props['aria-labelledby'],
      'aria-disabled': disabled || props['aria-disabled'],
      'aria-expanded': visible,
    })
    const hint = [
      description,
      props.title !== accessibleName ? props.title : undefined,
      (required || enabledAria(props['aria-required'])) &&
        t('ui.a11y.required', undefined, { defaultValue: 'Required field' }),
      enabledAria(props['aria-invalid']) &&
        t('ui.a11y.invalid', undefined, { defaultValue: 'Invalid value' }),
      enabledAria(props['aria-readonly']) &&
        t('ui.a11y.readonly', undefined, { defaultValue: 'Read-only field' }),
      accessibility.accessibilityHint,
    ]
      .filter(Boolean)
      .join(', ')
    const split = splitClasses(
      useTagClasses(props.className, props.as),
      useInheritedText(),
      dataAttributes(props),
    )
    const line = useLineStart(replacedFlow(props.className, props.as))
    const grid = useGridCell()
    const {
      color,
      fontSize,
      fontWeight,
      fontStyle,
      letterSpacing,
      lineHeight,
      textAlign,
      textTransform,
      textDecorationLine,
      ...viewStyle
    } = nativeStyle(props.style, props.webStyle) ?? {}
    const { onHoverIn, onHoverOut } = pressProps(props)
    const focusChanged = (gained: boolean): void => {
      const handler = gained ? onFocus : onBlur
      handler?.(Object.assign(fieldEvent(snapshot(read())), { relatedTarget: null }))
    }
    return (
      <ElementScope split={split}>
        <SelectAction
          {...accessibility}
          ref={trigger}
          keyboard={keyboard}
          disabled={disabled}
          tabIndex={props.tabIndex === undefined ? undefined : props.tabIndex >= 0 ? 0 : -1}
          className={split.view || undefined}
          style={[{ minHeight: 36, justifyContent: 'center' }, viewStyle, line, grid]}
          accessibilityHint={hint || undefined}
          accessibilityValue={{ text: props['aria-valuetext'] ?? display }}
          onActivate={activate}
          onFocusChange={focusChanged}
          onHoverIn={onHoverIn}
          onHoverOut={onHoverOut}
          onHardwareKeyDown={props.onKeyDown}
          onHardwareKeyUp={props.onKeyUp}
        >
          <NativeText
            accessible={false}
            importantForAccessibility="no"
            className={split.text || undefined}
            numberOfLines={split.lines ?? undefined}
            style={{
              color,
              fontSize,
              fontWeight,
              fontStyle,
              letterSpacing,
              lineHeight,
              textAlign,
              textTransform,
              textDecorationLine,
            }}
          >
            {display}
          </NativeText>
        </SelectAction>
        <SelectMenu
          visible={visible}
          keyboard={keyboard}
          name={accessibleName}
          multiple={multiple}
          rows={rows}
          choices={choices}
          selected={selected}
          choose={choose}
          dismiss={dismiss}
          onDismiss={restore}
          onKeyDown={props.onKeyDown}
          onKeyUp={props.onKeyUp}
        />
      </ElementScope>
    )
  },
)

interface KitSelectSnapshot {
  id?: string
  name: string
  type: 'select-one' | 'select-multiple'
  multiple: boolean
  value: string
  selectedIndex: number
  selectedOptions: readonly { value: string; label: string; disabled: boolean }[]
  focus(): void
  blur(): void
}

/** Reads a true ARIA flag in either of its public spellings. */
function enabledAria(value: boolean | 'true' | 'false' | undefined): boolean {
  return value === true || value === 'true'
}

registerInline(SelectField, (props) => replacedFlow(props.className, 'select'))
