/**
 * React Native keyboard provider using Keyboard from react-native.
 *
 * Implements the KeyboardProvider interface from `@molecule/app-keyboard`.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import type {
  AccessoryBarOptions,
  KeyboardCapabilities,
  KeyboardHideEvent,
  KeyboardProvider,
  KeyboardResizeMode,
  KeyboardScrollOptions,
  KeyboardShowEvent,
  KeyboardState,
  KeyboardStyle,
} from '@molecule/app-keyboard'
import { getLogger } from '@molecule/app-logger'

import type { ReactNativeKeyboardConfig } from './types.js'

/** Minimal shape of react-native Keyboard and Dimensions modules. */
interface RNKeyboard {
  dismiss(): void
  addListener(
    event: string,
    callback: (e: { endCoordinates?: { height?: number }; duration?: number }) => void,
  ): { remove(): void }
}

interface RNDimensions {
  get(dim: string): { height: number; width: number }
}

/**
 * Dynamically loads react-native Keyboard and Dimensions.
 * @returns The Keyboard and Dimensions modules.
 */
async function getReactNativeKeyboard(): Promise<{
  Keyboard: RNKeyboard
  Dimensions: RNDimensions
}> {
  try {
    // @ts-expect-error — react-native is a peer dependency loaded at runtime
    const RN = (await import('react-native')) as unknown as {
      Keyboard: RNKeyboard
      Dimensions: RNDimensions
    }
    return { Keyboard: RN.Keyboard, Dimensions: RN.Dimensions }
  } catch {
    throw new Error(
      t(
        'keyboard.error.missingDependency',
        { library: 'react-native' },
        { defaultValue: 'react-native is required but not installed.' },
      ),
    )
  }
}

/**
 * Creates a React Native keyboard provider backed by react-native Keyboard.
 *
 * @param config - Optional provider configuration.
 * @returns A KeyboardProvider implementation for React Native.
 */
export function createReactNativeKeyboardProvider(
  config: ReactNativeKeyboardConfig = {},
): KeyboardProvider {
  const { defaultScrollPadding = 20 } = config
  const logger = getLogger('keyboard')
  let isKeyboardVisible = false
  let keyboardHeight = 0
  const subscriptions: Array<{ remove(): void }> = []

  const provider: KeyboardProvider = {
    async show(): Promise<void> {
      // React Native does not support programmatic keyboard show.
      // The keyboard appears when a TextInput is focused.
    },

    async hide(): Promise<void> {
      const { Keyboard } = await getReactNativeKeyboard()
      Keyboard.dismiss()
    },

    async toggle(): Promise<void> {
      if (isKeyboardVisible) {
        await provider.hide()
      }
      // Cannot programmatically show keyboard in RN without focusing an input.
    },

    async getState(): Promise<KeyboardState> {
      const { Dimensions } = await getReactNativeKeyboard()
      const screen = Dimensions.get('screen')
      return {
        isVisible: isKeyboardVisible,
        height: keyboardHeight,
        screenHeight: screen.height - keyboardHeight,
      }
    },

    async isVisible(): Promise<boolean> {
      return isKeyboardVisible
    },

    async setResizeMode(_mode: KeyboardResizeMode): Promise<void> {
      // Resize mode is configured via AndroidManifest.xml or app.json,
      // not at runtime in React Native.
    },

    async setStyle(_style: KeyboardStyle): Promise<void> {
      // Keyboard style (dark/light) is not directly configurable
      // via the built-in React Native Keyboard API.
    },

    async setAccessoryBar(_options: AccessoryBarOptions): Promise<void> {
      // Accessory bar control is not available in the built-in
      // React Native Keyboard API.
    },

    async setScroll(_options: KeyboardScrollOptions): Promise<void> {
      // Scroll behavior is managed by KeyboardAvoidingView or
      // ScrollView keyboardShouldPersistTaps in React Native.
      void defaultScrollPadding
    },

    onShow(callback: (event: KeyboardShowEvent) => void): () => void {
      let subscription: { remove(): void } | undefined

      void getReactNativeKeyboard()
        .then(({ Keyboard: keyboard }) => {
          subscription = keyboard.addListener('keyboardDidShow', (e) => {
            const height = e.endCoordinates?.height ?? 0
            isKeyboardVisible = true
            keyboardHeight = height
            callback({
              keyboardHeight: height,
              animationDuration: e.duration,
            })
          })
          subscriptions.push(subscription)
        })
        .catch((err: unknown) => {
          logger.warn('Failed to attach keyboard show listener', err)
        })

      return () => {
        subscription?.remove()
      }
    },

    onHide(callback: (event: KeyboardHideEvent) => void): () => void {
      let subscription: { remove(): void } | undefined

      void getReactNativeKeyboard()
        .then(({ Keyboard: keyboard }) => {
          subscription = keyboard.addListener('keyboardDidHide', (e) => {
            isKeyboardVisible = false
            keyboardHeight = 0
            callback({
              animationDuration: e.duration,
            })
          })
          subscriptions.push(subscription)
        })
        .catch((err: unknown) => {
          logger.warn('Failed to attach keyboard hide listener', err)
        })

      return () => {
        subscription?.remove()
      }
    },

    async getCapabilities(): Promise<KeyboardCapabilities> {
      return {
        supported: true,
        canShowHide: false,
        canSetResizeMode: false,
        canSetStyle: false,
        canControlAccessoryBar: false,
        canControlScroll: false,
      }
    },
  }

  return provider
}

/** Default React Native keyboard provider. */
export const provider: KeyboardProvider = createReactNativeKeyboardProvider()
