/**
 * Minimal type declarations for react-native primitives used by this package.
 *
 * The real types ship with `react-native` itself (bundled since v0.71 — there is
 * no separate `@types/react-native` on npm). However, `react-native`'s entry
 * point uses Flow syntax that Vite/Rollup/Node.js cannot parse, so installing it
 * in a non-RN workspace breaks Vitest across every package that mocks it. This
 * stub provides the subset we need for compilation; the real types take over when
 * the package is consumed in an actual React Native project.
 *
 * @module
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module 'react-native' {
  import { Component, type ComponentType, type ReactNode } from 'react'

  // ---- Accessibility ----
  type AccessibilityRole =
    | 'none'
    | 'button'
    | 'link'
    | 'search'
    | 'image'
    | 'keyboardkey'
    | 'text'
    | 'adjustable'
    | 'imagebutton'
    | 'header'
    | 'summary'
    | 'alert'
    | 'checkbox'
    | 'combobox'
    | 'menu'
    | 'menubar'
    | 'menuitem'
    | 'progressbar'
    | 'radio'
    | 'radiogroup'
    | 'scrollbar'
    | 'spinbutton'
    | 'switch'
    | 'tab'
    | 'tabbar'
    | 'tablist'
    | 'timer'
    | 'list'
    | 'toolbar'

  // ---- Style types ----
  interface ViewStyle {
    width?: number | 'auto' | `${number}%`
    height?: number | 'auto' | `${number}%`
    borderRadius?: number
    opacity?: number
    [key: string]: unknown
  }

  // ---- Shared prop shapes ----
  interface AccessibilityProps {
    accessibilityRole?: AccessibilityRole
    accessibilityState?: Record<string, unknown>
    accessibilityLabel?: string
    accessibilityValue?: Record<string, unknown>
  }

  interface ViewProps extends AccessibilityProps {
    children?: ReactNode
    className?: string
    style?: ViewStyle | ViewStyle[] | object
    testID?: string
    onTouchEnd?: () => void
  }

  interface TextProps extends ViewProps {}

  interface PressableProps extends ViewProps {
    onPress?: ((event?: any) => void) | (() => void)
    onLongPress?: () => void
    onPressOut?: () => void
    disabled?: boolean
  }

  interface TextInputProps extends ViewProps {
    editable?: boolean
    placeholder?: string
    value?: string
    onChangeText?: (text: string) => void
    onFocus?: (() => void) | ((event?: any) => void)
    onBlur?: (() => void) | ((event?: any) => void)
    secureTextEntry?: boolean
    keyboardType?: string
    multiline?: boolean
    numberOfLines?: number
    textAlignVertical?: string
    autoComplete?: string
  }

  interface ImageProps extends ViewProps {
    source: { uri: string } | number
    onError?: () => void
  }

  interface FlatListProps<ItemT> extends ViewProps {
    data: readonly ItemT[] | null | undefined
    keyExtractor?: (item: ItemT, index: number) => string
    renderItem: (info: { item: ItemT; index: number }) => ReactNode
  }

  interface ModalProps extends ViewProps {
    visible?: boolean
    transparent?: boolean
    animationType?: 'none' | 'slide' | 'fade'
    onRequestClose?: () => void
  }

  interface SwitchComponentProps extends ViewProps {
    value?: boolean
    onValueChange?: (value: boolean) => void
    disabled?: boolean
  }

  interface ActivityIndicatorProps extends ViewProps {
    size?: 'small' | 'large'
    color?: string
  }

  interface ScrollViewProps extends ViewProps {}

  // ---- Component exports ----
  export const View: ComponentType<ViewProps>
  export const Text: ComponentType<TextProps>
  export const Pressable: ComponentType<PressableProps>
  export const Image: ComponentType<ImageProps>
  export const Modal: ComponentType<ModalProps>
  export const Switch: ComponentType<SwitchComponentProps>
  export const ActivityIndicator: ComponentType<ActivityIndicatorProps>
  export const ScrollView: ComponentType<ScrollViewProps>

  /** TextInput — exported as class for JSX use and `forwardRef` ref typing. */
  export class TextInput extends Component<TextInputProps> {}

  /** FlatList — generic component whose item type flows from `data`. */
  export function FlatList<ItemT = any>(props: FlatListProps<ItemT>): ReactNode

  // ---- Animated API ----
  export namespace Animated {
    class Value {
      constructor(value: number)
    }
    const View: ComponentType<ViewProps & { style?: any }>
    function timing(
      value: Value,
      config: { toValue: number; duration: number; useNativeDriver: boolean },
    ): {
      start: (callback?: () => void) => void
    }
    function loop(animation: { start: (callback?: () => void) => void; stop: () => void }): {
      start: () => void
      stop: () => void
    }
    function sequence(animations: Array<{ start: (callback?: () => void) => void }>): {
      start: (callback?: () => void) => void
      stop: () => void
    }
  }

  // ---- Re-export types used by components ----
  export type { ViewStyle, AccessibilityRole }
}
