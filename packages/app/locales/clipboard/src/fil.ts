import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Filipino. */
export const fil: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Walang provider na naka-set. Tumawag ng setProvider() na may ClipboardProvider na implementasyon (hal., mula sa @molecule/app-clipboard-react-native).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: ang onChange ay hindi sinusuportahan ng provider',
  'clipboard.error.missingDependency':
    'Kinakailangan ang `{{library}}` ngunit hindi pa naka-install. I-install ito gamit ang: `npm install {{library}}`',
}
