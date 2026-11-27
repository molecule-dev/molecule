/**
 * The `className` prop the native kit passes to React Native components. A class-name runtime
 * (nativewind, which the `@molecule/app-ui-nativewind` ClassMap targets) turns it into styles; this
 * declares the prop so the kit compiles against React Native's own types without depending on one.
 *
 * @module
 */

import type {} from 'react-native'
import type {} from 'react-native-svg'

declare module 'react-native' {
  interface ViewProps {
    /** ClassMap classes. */
    className?: string
    /** A heading's level: react-native-web renders `role="heading"` as `h1`–`h6` by it; a device reads the role alone. */
    'aria-level'?: number
  }
  interface TextProps {
    /** ClassMap classes. */
    className?: string
    /** A heading's level: react-native-web renders `role="heading"` as `h1`–`h6` by it; a device reads the role alone. */
    'aria-level'?: number
  }
  interface TextInputProps {
    /** ClassMap classes. */
    className?: string
  }
  interface ImagePropsBase {
    /** ClassMap classes. */
    className?: string
  }
  interface ScrollViewProps {
    /** ClassMap classes. */
    className?: string
  }
  interface PressableProps {
    /** ClassMap classes. */
    className?: string
  }
}

declare module 'react-native-svg' {
  interface SvgProps {
    /** ClassMap classes. */
    className?: string
  }
}
