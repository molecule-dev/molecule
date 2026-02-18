import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Japanese. */
export const ja: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: プロバイダーが設定されていません。ClipboardProviderの実装でsetProvider()を呼び出してください（例: @molecule/app-clipboard-capacitorから）。',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChangeはプロバイダーでサポートされていません',
}
