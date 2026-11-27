import {
  type ComponentRef,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import {
  AccessibilityInfo,
  findNodeHandle,
  type GestureResponderEvent,
  Platform,
  Pressable as NativePressable,
  type PressableProps,
  StyleSheet,
  UIManager,
  View,
  type ViewProps,
} from 'react-native'

import type { ElementHandle, KeyboardEventHandler, KitKeyboardEvent } from '@molecule/app-ui'

import {
  getNativeKeyboardView,
  type NativeKeyboardView,
  type NativeKeyPress,
  rangeKeyboardEvent,
} from './rangeKeyboard.js'

/** Focuses both the keyboard target and, when requested, the screen reader target. */
export interface SelectActionHandle extends ElementHandle {
  focus(announce?: boolean): void
}

interface SelectActionProps extends ViewProps, Pick<PressableProps, 'onHoverIn' | 'onHoverOut'> {
  keyboard: boolean
  lockFocus?: number
  disabled?: boolean
  onActivate: (event?: GestureResponderEvent) => void
  onFocusChange?: (focused: boolean) => void
  onHardwareKeyDown?: KeyboardEventHandler
  onHardwareKeyUp?: KeyboardEventHandler
  onNavigate?: (event: KitKeyboardEvent) => void
}

/** A press target with a single optional hardware and accessibility focus host. */
export const SelectAction = forwardRef<SelectActionHandle, SelectActionProps>(function SelectAction(
  {
    keyboard: useHardwareKeyboard,
    lockFocus,
    disabled = false,
    tabIndex,
    onActivate,
    onFocusChange,
    onHardwareKeyDown,
    onHardwareKeyUp,
    onNavigate,
    onHoverIn,
    onHoverOut,
    children,
    className,
    style,
    ...props
  },
  ref,
) {
  const KeyboardView = useHardwareKeyboard ? getNativeKeyboardView() : undefined
  const keyboard = Boolean(KeyboardView)
  const stock = useRef<View>(null)
  const hardware = useRef<ComponentRef<NativeKeyboardView>>(null)
  const [focusRequest, requestFocus] = useState<{ announce: boolean } | null>(null)
  const [hostRevision, changeHost] = useState(0)
  const focused = useRef(false)
  const held = useRef<{ key: string; canceled: boolean } | null>(null)
  const cleanupFrame = useRef<number | null>(null)
  const hidden = props['aria-hidden'] === true
  const canFocus = !disabled && (tabIndex !== -1 || focusRequest !== null)

  const clearKey = (): void => {
    held.current = null
    if (cleanupFrame.current !== null) {
      cancelAnimationFrame(cleanupFrame.current)
      cleanupFrame.current = null
    }
  }
  useEffect(() => clearKey, [])

  const reportFocus = (next: boolean): void => {
    if (focused.current === next) return
    focused.current = next
    if (!next) {
      clearKey()
      requestFocus(null)
    }
    onFocusChange?.(next)
  }
  useImperativeHandle(ref, () => ({
    focus(announce = false): void {
      if (!disabled) requestFocus({ announce })
    },
    blur(): void {
      requestFocus(null)
      reportFocus(false)
      // Neither the native keyboard view nor stock iOS View exposes an imperative blur command.
      changeHost((revision) => revision + 1)
    },
  }))
  useLayoutEffect(() => {
    if (disabled) {
      clearKey()
      requestFocus(null)
    }
  }, [disabled])
  useLayoutEffect(() => {
    const host = keyboard ? hardware.current : stock.current
    if (!focusRequest || disabled || !host) return
    const tag = findNodeHandle(host)
    if (tag === null) return
    if (keyboard) UIManager.dispatchViewManagerCommand(tag, 'rnekKeyboardFocus', [])
    else if (Platform.OS !== 'android' && Platform.OS !== 'ios') host.focus()
    // Android's stock focus request is the View's hasTVPreferredFocus prop. On iOS the
    // stock route can request accessibility focus, while Full Keyboard Access owns hardware focus.
    if (!hidden && (focusRequest.announce || (!keyboard && Platform.OS === 'ios')))
      AccessibilityInfo.setAccessibilityFocus(tag)
  }, [disabled, focusRequest, hidden, keyboard])

  const press = (event?: GestureResponderEvent): void => {
    if (!disabled && !held.current && cleanupFrame.current === null) onActivate(event)
  }
  const keyDown = (native: NativeKeyPress): void => {
    if (disabled) return
    const event = rangeKeyboardEvent(native)
    onHardwareKeyDown?.(event)
    if (event.key === 'Enter' || event.key === ' ') {
      if (!held.current) held.current = { key: event.key, canceled: event.defaultPrevented }
    } else if (!event.defaultPrevented) {
      onNavigate?.(event)
    }
  }
  const keyUp = (native: NativeKeyPress): void => {
    if (disabled) return
    const event = rangeKeyboardEvent(native)
    onHardwareKeyUp?.(event)
    const activation = held.current
    if (!activation || activation.key !== event.key) return
    clearKey()
    // Some native focus engines send an extra click for the same key. An actual touch starts
    // with press-in and can clear the guard before activating.
    cleanupFrame.current = requestAnimationFrame(() => {
      cleanupFrame.current = null
    })
    if (!activation.canceled && !event.defaultPrevented) onActivate()
  }

  if (!KeyboardView) {
    return (
      <NativePressable
        {...props}
        key={hostRevision}
        ref={stock}
        className={className}
        style={style}
        accessible={!hidden && (Platform.OS !== 'android' || canFocus)}
        importantForAccessibility={hidden ? 'no-hide-descendants' : 'yes'}
        disabled={disabled}
        focusable={canFocus}
        tabIndex={canFocus ? 0 : -1}
        hasTVPreferredFocus={Platform.OS === 'android' && focusRequest !== null && !disabled}
        onPress={press}
        onFocus={() => reportFocus(true)}
        onBlur={() => reportFocus(false)}
        onHoverIn={onHoverIn}
        onHoverOut={onHoverOut}
      >
        {children}
      </NativePressable>
    )
  }
  return (
    <View className={className} style={style} accessible={false}>
      {children}
      <KeyboardView
        {...props}
        key={hostRevision}
        ref={hardware}
        style={StyleSheet.absoluteFill}
        accessible={!hidden}
        importantForAccessibility={hidden ? 'no-hide-descendants' : 'yes'}
        canBeFocused={canFocus}
        haloEffect
        lockFocus={lockFocus}
        hasKeyDownPress
        hasKeyUpPress
        onKeyDownPress={keyDown}
        onKeyUpPress={keyUp}
        hasOnFocusChanged
        onFocusChange={({ nativeEvent }) => reportFocus(nativeEvent.isFocused)}
        accessibilityActions={!disabled && !hidden ? [{ name: 'activate' }] : undefined}
        onAccessibilityAction={({ nativeEvent }) => {
          if (nativeEvent.actionName === 'activate') press()
        }}
        onAccessibilityTap={() => press()}
      >
        <NativePressable
          style={StyleSheet.absoluteFill}
          disabled={disabled}
          accessible={false}
          importantForAccessibility="no-hide-descendants"
          focusable={false}
          onPressIn={clearKey}
          onPress={press}
          onHoverIn={onHoverIn}
          onHoverOut={onHoverOut}
        />
      </KeyboardView>
    </View>
  )
})
