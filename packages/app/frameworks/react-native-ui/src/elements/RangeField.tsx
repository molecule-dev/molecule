/**
 * RangeField: a numeric platform slider with native forms and accessibility.
 *
 * @module
 */

import Slider from '@react-native-community/slider'
import {
  type ComponentRef,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  AccessibilityInfo,
  findNodeHandle,
  Platform,
  UIManager,
  View,
  type ViewProps,
  type ViewStyle,
} from 'react-native'

import type { ElementHandle, RangeFieldProps } from '@molecule/app-ui'

import { nativeAccessibility } from './accessibility.js'
import { focusEvent, mouseEvent } from './events.js'
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
import {
  getNativeKeyboardView,
  type NativeKeyboardView,
  RANGE_DIRECTIONAL_KEYS,
  rangeKeyboardEvent,
} from './rangeKeyboard.js'
import { finiteRangeNumber, rangeValues } from './rangeValues.js'
import { nativeStyle } from './style.js'

type RangeHost = View | ComponentRef<NativeKeyboardView>

const ADJUST_ACTIONS = [{ name: 'increment' }, { name: 'decrement' }]

/** Gives the rotated track a vertical layout footprint. */
function verticalFrame(style: ViewStyle | undefined): ViewStyle {
  const { width, height, transform, ...rest } = style ?? {}
  const steps = typeof transform === 'string' ? undefined : transform
  const quarterTurn = steps?.find(
    (step) => 'rotate' in step && typeof step.rotate === 'string' && /^-?90deg$/.test(step.rotate),
  )
  return {
    ...rest,
    width: (quarterTurn ? height : width) ?? 40,
    height: (quarterTurn ? width : height) ?? 160,
    transform: quarterTurn ? steps?.filter((step) => step !== quarterTurn) : transform,
    alignItems: 'center',
    justifyContent: 'center',
  }
}

/**
 * Renders the platform's slider and exposes its logical value to the native form and keyboard.
 */
export const RangeField = forwardRef<ElementHandle, RangeFieldProps>(
  function RangeField(props, ref) {
    const { min, max, step, value, defaultValue, name, onValueChange, style, webStyle } = props
    const base =
      finiteRangeNumber(min) ?? finiteRangeNumber(value) ?? finiteRangeNumber(defaultValue) ?? 0
    const range = useMemo(() => rangeValues(min, max, step, base), [min, max, step, base])
    const field = useFieldValue(
      value === undefined ? undefined : range.normalize(value),
      range.normalize(defaultValue),
    )
    const displayed = range.normalize(field.displayed)
    const read = (): number => range.normalize(field.read())
    useLayoutEffect(() => {
      if (field.displayed !== displayed) field.change(displayed, () => undefined)
    }, [field, displayed])

    const form = useContext(FormScope)
    const fieldsetDisabled = useContext(DisabledScope)
    const disabled = fieldsetDisabled || props.disabled === true
    const accessibility = nativeAccessibility(props)
    const hidden = accessibility['aria-hidden'] === true
    const canAdjust = !disabled && range.hasChoices
    const KeyboardView = useMemo(getNativeKeyboardView, [])
    const keyboard = Boolean(KeyboardView)
    const [focusRevision, setFocusRevision] = useState(0)
    const [requestedFocus, requestFocus] = useState(false)
    const focused = useRef(false)
    const tabStop = (props.tabIndex ?? 0) >= 0
    const host = useRef<RangeHost | null>(null)
    const setHost = (view: RangeHost | null): void => {
      host.current = view
    }
    const focusTarget = useCallback(
      (target: RangeHost): void => {
        if (keyboard) {
          const handle = findNodeHandle(target)
          if (handle !== null) UIManager.dispatchViewManagerCommand(handle, 'rnekKeyboardFocus', [])
        } else {
          target.focus()
        }
      },
      [keyboard],
    )
    const focus = (): void => {
      const target = host.current
      if (disabled || hidden || !target) return
      if (keyboard && !tabStop && !requestedFocus) requestFocus(true)
      else focusTarget(target)
    }
    useLayoutEffect(() => {
      if (requestedFocus && host.current && !hidden && !disabled) focusTarget(host.current)
    }, [requestedFocus, hidden, disabled, focusTarget])
    const loseFocus = (): void => {
      if (requestedFocus) requestFocus(false)
      if (!focused.current) return
      focused.current = false
      props.onBlur?.(focusEvent())
    }
    const label = useLabelable(props.id, focus)
    useFormRegistration(form?.fields, {
      entries: () => (name && !disabled ? [[name, String(read())]] : []),
      valid: () => true,
      reset: field.reset,
      focus,
    })

    const change = (next: number): boolean => {
      if (!canAdjust || next === read()) return false
      field.change(next, () => onValueChange?.(next))
      return true
    }

    const [trackLength, setTrackLength] = useState<number>()
    const [thumbRevision, setThumbRevision] = useState(0)
    const [heldWrite, holdWrite] = useState<number>()
    const gesture = useRef<{ last: number } | null>(null)
    useImperativeHandle(ref, () => ({
      focus,
      blur: () => {
        if (!keyboard) {
          host.current?.blur()
          return
        }
        // Removing the focused host releases hardware focus on both platforms.
        gesture.current = null
        holdWrite(undefined)
        loseFocus()
        setFocusRevision((revision) => revision + 1)
      },
    }))
    const trackKey = `${range.nativeMax}:${range.nativeStep}:${canAdjust}`
    useLayoutEffect(() => {
      gesture.current = null
      holdWrite(undefined)
    }, [trackKey])
    const write = range.toNative(displayed)
    const trackChange = (position: number): void => {
      const active = gesture.current
      if (!active || !Number.isFinite(position)) return
      // Fabric may echo writes on Android. Only progress from an active gesture is an edit.
      const next = range.fromNative(position)
      if (active.last === next) return
      active.last = next
      change(next)
    }

    const spoken = props['aria-valuetext'] ?? range.spoken(displayed)
    const [announcement, setAnnouncement] = useState<{ value: number }>()
    const lastAnnouncement = useRef<typeof announcement>(undefined)
    useEffect(() => {
      if (!announcement || announcement === lastAnnouncement.current) return
      lastAnnouncement.current = announcement
      // React Native 0.79 skips TalkBack's selected event when accessibilityValue has text.
      if (announcement.value === displayed) AccessibilityInfo.announceForAccessibility(spoken)
    }, [announcement, displayed, spoken])

    const vertical = props['aria-orientation'] === 'vertical'
    const elementStyle = nativeStyle(style, webStyle)
    const frame = vertical ? verticalFrame(elementStyle) : elementStyle
    const split = splitClasses(
      useTagClasses(props.className, 'input'),
      useInheritedText(),
      dataAttributes(props),
    )
    const line = useLineStart(replacedFlow(props.className, 'input'))
    const grid = useGridCell()
    const android = Platform.OS === 'android'
    // Android's delegate truncates a numeric range to signed integers. TalkBack can suppress an
    // action at the wrong bound unless fractional controls expose their value as text alone.
    const exposeNumbers =
      !android || (props['aria-valuetext'] === undefined && range.hasIntegerAccessibilityValue)
    const control: ViewProps & Pick<RangeFieldProps, 'lang'> = {
      nativeID: props.id,
      testID: accessibility.testID,
      className: split.view || undefined,
      style: [vertical ? frame : [{ minWidth: 40 }, frame], line, grid],
      onLayout: vertical
        ? ({ nativeEvent }) => setTrackLength(nativeEvent.layout.height)
        : undefined,
      accessible: !hidden,
      focusable: !disabled && !hidden && (tabStop || requestedFocus),
      accessibilityElementsHidden: hidden,
      importantForAccessibility: hidden ? 'no-hide-descendants' : 'yes',
      // `role` exposes an Android SeekBar and acknowledges the dispatched action. UIKit needs
      // the legacy adjustable role to apply its adjustable accessibility trait.
      role: android ? 'slider' : undefined,
      accessibilityRole: android ? undefined : 'adjustable',
      accessibilityLabel: props['aria-label'] ?? label,
      accessibilityLanguage: accessibility.accessibilityLanguage,
      lang: accessibility.lang,
      accessibilityLabelledBy: props['aria-labelledby'],
      accessibilityState: { disabled: disabled || accessibility['aria-disabled'] },
      accessibilityValue: exposeNumbers
        ? { min: range.low, max: range.high, now: displayed, text: spoken }
        : { text: spoken },
      accessibilityActions:
        canAdjust && !hidden
          ? ADJUST_ACTIONS.filter(({ name }) =>
              name === 'increment' ? displayed < range.high : displayed > range.low,
            )
          : [],
      onAccessibilityAction: ({ nativeEvent }) => {
        if (
          hidden ||
          (nativeEvent.actionName !== 'increment' && nativeEvent.actionName !== 'decrement')
        )
          return
        const next = range.nudge(read(), nativeEvent.actionName === 'increment' ? 1 : -1)
        if (change(next) && android) setAnnouncement({ value: next })
      },
    }

    const slider = (
      <Slider
        key={`${trackKey}:${thumbRevision}`}
        minimumValue={1}
        maximumValue={range.nativeMax}
        step={range.nativeStep}
        value={heldWrite ?? write}
        disabled={!canAdjust}
        tapToSeek
        accessible={false}
        focusable={false}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={
          vertical
            ? {
                width: trackLength ?? (typeof frame?.height === 'number' ? frame.height : 160),
                transform: [{ rotate: '-90deg' }],
              }
            : { width: '100%' }
        }
        onSlidingStart={() => {
          if (!canAdjust) return
          gesture.current = { last: read() }
          holdWrite(write)
        }}
        onValueChange={trackChange}
        onSlidingComplete={(position) => {
          if (!gesture.current) return
          try {
            trackChange(position)
            // Resend the prop even when a rejecting parent leaves its value unchanged.
            if (Number.isFinite(position) && range.fromNative(position) !== read()) {
              setThumbRevision((revision) => revision + 1)
            }
            props.onClick?.(mouseEvent(undefined))
          } finally {
            gesture.current = null
            holdWrite(undefined)
          }
        }}
      />
    )
    return (
      <ElementScope split={split}>
        {KeyboardView ? (
          <KeyboardView
            {...control}
            key={focusRevision}
            ref={setHost}
            canBeFocused={control.focusable === true}
            haloEffect
            lockFocus={canAdjust ? RANGE_DIRECTIONAL_KEYS : 0}
            hasKeyDownPress
            onKeyDownPress={(event) => {
              if (disabled || hidden) return
              const key = rangeKeyboardEvent(event)
              props.onKeyDown?.(key)
              if (key.defaultPrevented) return
              switch (key.key) {
                case 'ArrowUp':
                case 'ArrowRight':
                  change(range.nudge(read(), 1))
                  break
                case 'ArrowDown':
                case 'ArrowLeft':
                  change(range.nudge(read(), -1))
                  break
                case 'Home':
                  change(range.low)
                  break
                case 'End':
                  change(range.high)
                  break
              }
            }}
            hasKeyUpPress={!!props.onKeyUp}
            onKeyUpPress={
              props.onKeyUp ? (event) => props.onKeyUp?.(rangeKeyboardEvent(event)) : undefined
            }
            hasOnFocusChanged
            onFocusChange={({ nativeEvent }) => {
              if (nativeEvent.isFocused) {
                focused.current = true
                props.onFocus?.(focusEvent())
              } else {
                loseFocus()
              }
            }}
          >
            {slider}
          </KeyboardView>
        ) : (
          <View {...control} ref={setHost}>
            {slider}
          </View>
        )}
      </ElementScope>
    )
  },
)

registerInline(RangeField, (props) => replacedFlow(props.className, 'input'))
