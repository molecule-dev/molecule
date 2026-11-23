/**
 * A stand-in for `react-native` under Node: only what NativeWind's native
 * runtime and this package touch. Host components render their flattened style
 * into a `data-style` attribute, so a test reads the style a component received.
 * `Appearance` behaves as react-native's: `setColorScheme` overrides the device
 * setting for the app (`null` follows it again), and listeners hear every change
 * of the scheme the app sees.
 */
'use strict'

const React = require('react')

let os = 'light'
/**
 * The app's own setting (`Appearance.setColorScheme`); `null` follows the device.
 *
 * @type {'light' | 'dark' | null}
 */
let override = null
const listeners = new Set()

/**
 * The scheme the app sees: its own setting, else the device's.
 *
 * @returns {'light' | 'dark'} The scheme.
 */
const effective = () => override ?? os

/**
 * Applies a change and tells the listeners when the scheme the app sees moved.
 *
 * @param {() => void} change - The change.
 */
function update(change) {
  const before = effective()
  change()
  if (effective() === before) return
  for (const listener of [...listeners]) listener({ colorScheme: effective() })
}

/**
 * Flattens a react-native style prop.
 *
 * @param {unknown} style - A style, an array of styles, or nothing.
 * @returns {Record<string, unknown>} The merged style.
 */
function flatten(style) {
  if (!style) return {}
  if (Array.isArray(style)) return Object.assign({}, ...style.map(flatten))
  return Object.assign({}, style)
}

/**
 * A host component that renders its style as data.
 *
 * @param {string} name - The component's name.
 * @returns {(props: { style?: unknown, children?: unknown }) => unknown} The component.
 */
function host(name) {
  const Component = (props) =>
    React.createElement(
      name,
      { 'data-style': JSON.stringify(flatten(props.style)) },
      props.children,
    )
  Component.displayName = name
  return Component
}

const noopSubscription = () => ({ remove() {} })

module.exports = {
  Appearance: {
    getColorScheme: effective,
    setColorScheme: (value) =>
      update(() => {
        override = value === 'light' || value === 'dark' ? value : null
      }),
    addChangeListener: (listener) => {
      listeners.add(listener)
      return { remove: () => listeners.delete(listener) }
    },
  },
  /**
   * Changes the device's appearance setting, as the person would in Settings.
   *
   * @param {'light' | 'dark'} value - The new setting.
   */
  __setDeviceScheme(value) {
    update(() => {
      os = value
    })
  },
  /** Back to a light device with no app override. */
  __reset() {
    update(() => {
      os = 'light'
      override = null
    })
  },
  AppState: { currentState: 'active', addEventListener: noopSubscription },
  AccessibilityInfo: {
    isReduceMotionEnabled: () => Promise.resolve(false),
    addEventListener: noopSubscription,
  },
  Platform: {
    OS: 'ios',
    select: (options) => options.ios ?? options.native ?? options.default,
    constants: { reactNativeVersion: { major: 0, minor: 79, patch: 2 } },
  },
  PixelRatio: {
    get: () => 2,
    getFontScale: () => 1,
    getPixelSizeForLayoutSize: (n) => n * 2,
    roundToNearestPixel: (n) => n,
  },
  Dimensions: {
    get: () => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
    addEventListener: noopSubscription,
  },
  StyleSheet: {
    hairlineWidth: 0.5,
    flatten,
    create: (styles) => styles,
    absoluteFill: {},
    absoluteFillObject: {},
  },
  I18nManager: { isRTL: false },
  Easing: {},
  View: host('View'),
  Text: host('Text'),
  Pressable: host('Pressable'),
  Image: host('Image'),
  ScrollView: host('ScrollView'),
  TextInput: host('TextInput'),
  Modal: host('Modal'),
  FlatList: host('FlatList'),
  SafeAreaView: host('SafeAreaView'),
  TouchableOpacity: host('TouchableOpacity'),
  ActivityIndicator: host('ActivityIndicator'),
  Switch: host('Switch'),
  KeyboardAvoidingView: host('KeyboardAvoidingView'),
  StatusBar: host('StatusBar'),
  ImageBackground: host('ImageBackground'),
  VirtualizedList: host('VirtualizedList'),
  TouchableHighlight: host('TouchableHighlight'),
  TouchableWithoutFeedback: host('TouchableWithoutFeedback'),
  SectionList: host('SectionList'),
  InputAccessoryView: host('InputAccessoryView'),
  RefreshControl: host('RefreshControl'),
  Button: host('Button'),
}
