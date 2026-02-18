import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Estonian. */
export const et: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Teenusepakkuja pole määratud. Kutsuge setProvider() ClipboardProvideri teostusega (nt @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange pole teenusepakkuja poolt toetatud',
}
