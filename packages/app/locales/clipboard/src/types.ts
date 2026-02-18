/** Translation keys for the clipboard locale package. */
export type ClipboardTranslationKey =
  | 'clipboard.error.noProvider'
  | 'clipboard.warn.onChangeNotSupported'

/** Translation record mapping clipboard keys to translated strings. */
export type ClipboardTranslations = Record<ClipboardTranslationKey, string>
