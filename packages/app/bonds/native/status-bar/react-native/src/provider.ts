/**
 * React Native status bar provider using StatusBar from react-native.
 *
 * Implements the StatusBarProvider interface from `@molecule/app-status-bar`.
 *
 * @module
 */

import type { StatusBarStatic } from 'react-native'

import { t } from '@molecule/app-i18n'
import type {
  StatusBarAnimation,
  StatusBarCapabilities,
  StatusBarConfig,
  StatusBarProvider,
  StatusBarState,
  StatusBarStyle,
} from '@molecule/app-status-bar'

import type { ReactNativeStatusBarConfig } from './types.js'

/**
 * Dynamically loads react-native StatusBar.
 * @returns The StatusBar module.
 */
async function getReactNativeStatusBar(): Promise<StatusBarStatic> {
  try {
    const { StatusBar } = await import('react-native')
    return StatusBar
  } catch (error) {
    throw new Error(
      t(
        'statusBar.error.missingDependency',
        { library: 'react-native' },
        { defaultValue: 'react-native is required but not installed.' },
      ),
      { cause: error },
    )
  }
}

/**
 * Maps molecule StatusBarStyle to React Native bar style string.
 * @param style - The molecule style value.
 * @returns The React Native bar style string.
 */
function toRNBarStyle(style: StatusBarStyle): string {
  switch (style) {
    case 'dark':
      return 'dark-content'
    case 'light':
      return 'light-content'
    default:
      return 'default'
  }
}

/**
 * Maps molecule StatusBarAnimation to React Native animation string.
 * @param animation - The molecule animation value.
 * @returns The React Native animation string.
 */
function toRNAnimation(animation?: StatusBarAnimation): string {
  switch (animation) {
    case 'fade':
      return 'fade'
    case 'slide':
      return 'slide'
    default:
      return 'none'
  }
}

/**
 * Resolves the runtime platform, defaulting to 'android' when react-native is
 * unavailable (tests / non-RN environments).
 * @returns The current platform identifier.
 */
async function getRuntimePlatform(): Promise<'ios' | 'android' | 'web'> {
  try {
    const { Platform } = await import('react-native')
    const os = Platform.OS
    if (os === 'ios' || os === 'android' || os === 'web') return os
    return 'android'
  } catch (_error) {
    // react-native is not installed here; 'android' keeps capability detection
    // functional without throwing.
    return 'android'
  }
}

/**
 * Creates a React Native status bar provider backed by react-native StatusBar.
 *
 * @param config - Optional provider configuration.
 * @returns A StatusBarProvider implementation for React Native.
 */
export function createReactNativeStatusBarProvider(
  config: ReactNativeStatusBarConfig = {},
): StatusBarProvider {
  const { animated = true } = config

  let currentStyle: StatusBarStyle = config.initialStyle ?? 'default'
  let currentBackgroundColor: string = config.initialBackgroundColor ?? '#000000'
  let currentVisible = true
  let currentOverlaysWebView = false

  const provider: StatusBarProvider = {
    async setBackgroundColor(color: string): Promise<void> {
      const StatusBar = await getReactNativeStatusBar()
      StatusBar.setBackgroundColor(color, animated)
      currentBackgroundColor = color
    },

    async setStyle(style: StatusBarStyle): Promise<void> {
      const StatusBar = await getReactNativeStatusBar()
      StatusBar.setBarStyle(toRNBarStyle(style), animated)
      currentStyle = style
    },

    async show(animation?: StatusBarAnimation): Promise<void> {
      const StatusBar = await getReactNativeStatusBar()
      StatusBar.setHidden(false, toRNAnimation(animation))
      currentVisible = true
    },

    async hide(animation?: StatusBarAnimation): Promise<void> {
      const StatusBar = await getReactNativeStatusBar()
      StatusBar.setHidden(true, toRNAnimation(animation))
      currentVisible = false
    },

    async setOverlaysWebView(overlay: boolean): Promise<void> {
      const StatusBar = await getReactNativeStatusBar()
      StatusBar.setTranslucent(overlay)
      currentOverlaysWebView = overlay
    },

    async getState(): Promise<StatusBarState> {
      const StatusBar = await getReactNativeStatusBar()
      return {
        visible: currentVisible,
        backgroundColor: currentBackgroundColor,
        style: currentStyle,
        overlaysWebView: currentOverlaysWebView,
        height: StatusBar.currentHeight ?? 0,
      }
    },

    async getHeight(): Promise<number> {
      const StatusBar = await getReactNativeStatusBar()
      return StatusBar.currentHeight ?? 0
    },

    async configure(statusBarConfig: StatusBarConfig): Promise<void> {
      if (statusBarConfig.backgroundColor !== undefined) {
        await provider.setBackgroundColor(statusBarConfig.backgroundColor)
      }
      if (statusBarConfig.style !== undefined) {
        await provider.setStyle(statusBarConfig.style)
      }
      if (statusBarConfig.visible !== undefined) {
        if (statusBarConfig.visible) {
          await provider.show()
        } else {
          await provider.hide()
        }
      }
      if (statusBarConfig.overlaysWebView !== undefined) {
        await provider.setOverlaysWebView(statusBarConfig.overlaysWebView)
      }
    },

    async getCapabilities(): Promise<StatusBarCapabilities> {
      // `setBackgroundColor` and `setTranslucent` (overlay) are Android-only RN
      // StatusBar APIs — silent no-ops on iOS — so report them per-platform
      // instead of over-claiming `true` everywhere. Style, visibility, and
      // animation work on both platforms.
      const isAndroid = (await getRuntimePlatform()) === 'android'
      return {
        supported: true,
        canSetBackgroundColor: isAndroid,
        canSetStyle: true,
        canSetVisibility: true,
        canSetOverlay: isAndroid,
        supportsAnimation: true,
      }
    },
  }

  return provider
}

/** Default React Native status bar provider. */
export const provider: StatusBarProvider = createReactNativeStatusBarProvider()
