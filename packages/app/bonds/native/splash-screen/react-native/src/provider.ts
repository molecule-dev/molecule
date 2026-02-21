/**
 * React Native splash screen provider using expo-splash-screen.
 *
 * Implements the SplashScreenProvider interface from `@molecule/app-splash-screen`.
 *
 * @module
 */

import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'
import type {
  SplashScreenCapabilities,
  SplashScreenHideOptions,
  SplashScreenProvider,
  SplashScreenShowOptions,
  SplashScreenState,
} from '@molecule/app-splash-screen'

import type { ReactNativeSplashScreenConfig } from './types.js'

/** Minimal shape of expo-splash-screen module. */
interface ExpoSplashScreenModule {
  preventAutoHideAsync(): Promise<boolean>
  hideAsync(): Promise<boolean>
}

/**
 * Dynamically loads expo-splash-screen.
 * @returns The expo-splash-screen module.
 */
async function getExpoSplashScreen(): Promise<ExpoSplashScreenModule> {
  try {
    // @ts-expect-error — expo-splash-screen is a peer dependency loaded at runtime
    const mod = (await import('expo-splash-screen')) as unknown as ExpoSplashScreenModule
    return mod
  } catch {
    throw new Error(
      t(
        'splashScreen.error.missingDependency',
        { library: 'expo-splash-screen' },
        {
          defaultValue:
            'expo-splash-screen is required but not installed. Install it with: npx expo install expo-splash-screen',
        },
      ),
    )
  }
}

/**
 * Creates a React Native splash screen provider backed by expo-splash-screen.
 *
 * @param config - Optional provider configuration.
 * @returns A SplashScreenProvider implementation for React Native.
 */
export function createReactNativeSplashScreenProvider(
  config: ReactNativeSplashScreenConfig = {},
): SplashScreenProvider {
  const { preventAutoHide = true } = config
  const logger = getLogger('splash-screen')
  let isVisible = true
  let isAnimating = false

  // Prevent auto-hide on initialization if configured
  if (preventAutoHide) {
    void getExpoSplashScreen()
      .then((splashScreen) => {
        void splashScreen.preventAutoHideAsync()
      })
      .catch((err: unknown) => {
        logger.warn('Failed to prevent splash screen auto-hide', err)
      })
  }

  const provider: SplashScreenProvider = {
    async show(_options?: SplashScreenShowOptions): Promise<void> {
      const SplashScreen = await getExpoSplashScreen()
      await SplashScreen.preventAutoHideAsync()
      isVisible = true
    },

    async hide(_options?: SplashScreenHideOptions): Promise<void> {
      const SplashScreen = await getExpoSplashScreen()
      isAnimating = true
      try {
        await SplashScreen.hideAsync()
        isVisible = false
      } finally {
        isAnimating = false
      }
    },

    async getState(): Promise<SplashScreenState> {
      return {
        visible: isVisible,
        animating: isAnimating,
      }
    },

    async isVisible(): Promise<boolean> {
      return isVisible
    },

    async getCapabilities(): Promise<SplashScreenCapabilities> {
      return {
        supported: true,
        spinnerSupported: false,
        configurable: false,
        dynamicBackground: false,
      }
    },
  }

  return provider
}

/** Default React Native splash screen provider. */
export const provider: SplashScreenProvider = createReactNativeSplashScreenProvider()
