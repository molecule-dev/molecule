import {
  type HostComponent,
  type NativeSyntheticEvent,
  Platform,
  UIManager,
  type ViewProps,
} from 'react-native'

import type { KitKeyboardEvent } from '@molecule/app-ui'

import { keyboardEvent } from './events.js'

/** Key event from the optional native hardware-keyboard host. */
export type NativeKeyPress = NativeSyntheticEvent<
  Readonly<{
    keyCode: number
    unicode: number
    unicodeChar: string
    isLongPress: boolean
    isAltPressed: boolean
    isShiftPressed: boolean
    isCtrlPressed: boolean
    isCapsLockOn: boolean
    hasNoModifiers: boolean
  }>
>

/** Native view contract used by keyboard-aware kit controls. */
export interface NativeKeyboardViewProps extends ViewProps {
  canBeFocused?: boolean
  haloEffect?: boolean
  lockFocus?: number
  hasKeyDownPress?: boolean
  hasKeyUpPress?: boolean
  hasOnFocusChanged?: boolean
  onFocusChange?: (event: NativeSyntheticEvent<Readonly<{ isFocused: boolean }>>) => void
  onKeyDownPress?: (event: NativeKeyPress) => void
  onKeyUpPress?: (event: NativeKeyPress) => void
}

/** The registered hardware-keyboard host component. */
export type NativeKeyboardView = HostComponent<NativeKeyboardViewProps>

let keyboardView: NativeKeyboardView | undefined

/** Registers the keyboard host at startup in native builds that include it. */
export function setNativeKeyboardView(view: NativeKeyboardView | undefined): void {
  keyboardView = view
}

/** Resolves the optional host only in an application with its native manager. */
export function getNativeKeyboardView(): NativeKeyboardView | undefined {
  if (
    keyboardView &&
    (Platform.OS === 'android' || Platform.OS === 'ios') &&
    UIManager.hasViewManagerConfig('ExternalKeyboardView')
  )
    return keyboardView
}

/** Reports whether the optional keyboard host can be mounted. */
export function hasRangeKeyboardView(): boolean {
  return getNativeKeyboardView() !== undefined
}

/** ExternalKeyboardView's up, down, left and right focus locks. Tab remains available. */
export const RANGE_DIRECTIONAL_KEYS = 0b1111

const ANDROID_KEYS: Readonly<Record<number, string>> = {
  19: 'ArrowUp',
  20: 'ArrowDown',
  21: 'ArrowLeft',
  22: 'ArrowRight',
  23: 'Enter',
  61: 'Tab',
  62: ' ',
  66: 'Enter',
  111: 'Escape',
  122: 'Home',
  123: 'End',
  160: 'Enter',
}

const IOS_KEYS: Readonly<Record<number, string>> = {
  40: 'Enter',
  41: 'Escape',
  43: 'Tab',
  44: ' ',
  74: 'Home',
  77: 'End',
  79: 'ArrowRight',
  80: 'ArrowLeft',
  81: 'ArrowDown',
  82: 'ArrowUp',
  88: 'Enter',
}

/** Maps the hardware event and its modifier state into the kit's keyboard contract. */
export function rangeKeyboardEvent(event: NativeKeyPress): KitKeyboardEvent {
  const key = event.nativeEvent
  const names = Platform.OS === 'ios' ? IOS_KEYS : ANDROID_KEYS
  return Object.assign(keyboardEvent(names[key.keyCode] ?? (key.unicodeChar || 'Unidentified')), {
    altKey: key.isAltPressed,
    ctrlKey: key.isCtrlPressed,
    shiftKey: key.isShiftPressed,
    stopPropagation: () => event.stopPropagation(),
  })
}
