/**
 * React Native clipboard provider using `@react-native-clipboard/clipboard`.
 *
 * Implements the ClipboardProvider interface from `@molecule/app-clipboard`.
 *
 * @module
 */

import type {
  ClipboardCapabilities,
  ClipboardContent,
  ClipboardDataType,
  ClipboardProvider,
  ReadOptions,
  WriteOptions,
} from '@molecule/app-clipboard'
import { t } from '@molecule/app-i18n'
import { getLogger } from '@molecule/app-logger'

import type { ReactNativeClipboardConfig } from './types.js'

/** Minimal shape of `@react-native-clipboard/clipboard`. */
interface RNClipboard {
  getString(): Promise<string>
  setString(content: string): void
  hasString(): Promise<boolean>
  getImage?(): Promise<string | null>
  setImage?(image: string): void
  hasImage?(): Promise<boolean>
  hasURL?(): Promise<boolean>
  getStringAsync?(): Promise<string>
  setStringAsync?(content: string): Promise<boolean>
}

/**
 * Dynamically loads `@react-native-clipboard/clipboard`.
 * @returns The Clipboard module.
 */
async function getRNClipboard(): Promise<RNClipboard> {
  try {
    // @ts-expect-error — @react-native-clipboard/clipboard is a peer dependency loaded at runtime
    const mod = (await import('@react-native-clipboard/clipboard')) as unknown as {
      default?: RNClipboard
    } & RNClipboard
    return (mod.default ?? mod) as RNClipboard
  } catch {
    throw new Error(
      t(
        'clipboard.error.missingDependency',
        { library: '@react-native-clipboard/clipboard' },
        {
          defaultValue:
            '@react-native-clipboard/clipboard is required but not installed. Install it with: npm install @react-native-clipboard/clipboard',
        },
      ),
    )
  }
}

/**
 * Creates a React Native clipboard provider backed by `@react-native-clipboard/clipboard`.
 *
 * @param config - Optional provider configuration.
 * @returns A ClipboardProvider implementation for React Native.
 */
export function createReactNativeClipboardProvider(
  config: ReactNativeClipboardConfig = {},
): ClipboardProvider {
  const { pollForChanges = false, pollInterval = 1000 } = config
  const logger = getLogger('clipboard')

  const provider: ClipboardProvider = {
    async write(content: ClipboardContent, _options?: WriteOptions): Promise<void> {
      const Clipboard = await getRNClipboard()
      if (content.text !== undefined) {
        Clipboard.setString(content.text)
      } else if (content.html !== undefined) {
        // Fall back to plain text representation for HTML
        Clipboard.setString(content.html)
      } else if (
        content.image !== undefined &&
        Clipboard.setImage &&
        typeof content.image === 'string'
      ) {
        Clipboard.setImage(content.image)
      }
    },

    async writeText(text: string): Promise<void> {
      const Clipboard = await getRNClipboard()
      Clipboard.setString(text)
    },

    async writeHtml(html: string, _fallbackText?: string): Promise<void> {
      const Clipboard = await getRNClipboard()
      // React Native clipboard does not natively support HTML.
      // Write the HTML as plain text.
      Clipboard.setString(html)
    },

    async writeImage(image: string | Blob): Promise<void> {
      const Clipboard = await getRNClipboard()
      if (Clipboard.setImage && typeof image === 'string') {
        Clipboard.setImage(image)
      }
    },

    async read(_options?: ReadOptions): Promise<ClipboardContent> {
      const Clipboard = await getRNClipboard()
      const text = await Clipboard.getString()
      return { text }
    },

    async readText(): Promise<string> {
      const Clipboard = await getRNClipboard()
      return await Clipboard.getString()
    },

    async readHtml(): Promise<string | null> {
      // React Native clipboard does not natively support HTML reading.
      return null
    },

    async readImage(): Promise<string | null> {
      const Clipboard = await getRNClipboard()
      if (Clipboard.getImage) {
        return await Clipboard.getImage()
      }
      return null
    },

    async clear(): Promise<void> {
      const Clipboard = await getRNClipboard()
      Clipboard.setString('')
    },

    async hasContent(): Promise<boolean> {
      const Clipboard = await getRNClipboard()
      return await Clipboard.hasString()
    },

    async getAvailableTypes(): Promise<ClipboardDataType[]> {
      const Clipboard = await getRNClipboard()
      const types: ClipboardDataType[] = []
      const hasText = await Clipboard.hasString()
      if (hasText) types.push('text/plain')
      if (Clipboard.hasImage) {
        const hasImage = await Clipboard.hasImage()
        if (hasImage) types.push('image/png')
      }
      return types
    },

    async getCapabilities(): Promise<ClipboardCapabilities> {
      const Clipboard = await getRNClipboard()
      return {
        supported: true,
        canRead: true,
        canWrite: true,
        canReadImage: typeof Clipboard.getImage === 'function',
        canWriteImage: typeof Clipboard.setImage === 'function',
        canReadHtml: false,
      }
    },

    onChange(
      callback: (event: { hasContent: boolean; types: ClipboardDataType[] }) => void,
    ): () => void {
      if (!pollForChanges) {
        // No native clipboard change events in React Native.
        return () => {}
      }

      let lastContent = ''
      const intervalId = setInterval(async () => {
        try {
          const Clipboard = await getRNClipboard()
          const currentContent = await Clipboard.getString()
          if (currentContent !== lastContent) {
            lastContent = currentContent
            const types: ClipboardDataType[] = currentContent ? ['text/plain'] : []
            callback({ hasContent: !!currentContent, types })
          }
        } catch (err) {
          logger.warn('Clipboard polling error', err)
        }
      }, pollInterval)

      return () => {
        clearInterval(intervalId)
      }
    },
  }

  return provider
}

/** Default React Native clipboard provider. */
export const provider: ClipboardProvider = createReactNativeClipboardProvider()
