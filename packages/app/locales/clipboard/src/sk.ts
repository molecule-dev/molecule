import type { ClipboardTranslations } from './types.js'

/** Clipboard translations for Slovak. */
export const sk: ClipboardTranslations = {
  'clipboard.error.noProvider':
    '@molecule/app-clipboard: Poskytovateľ nie je nastavený. Zavolajte setProvider() s implementáciou ClipboardProvider (napr. z @molecule/app-clipboard-capacitor).',
  'clipboard.warn.onChangeNotSupported':
    '@molecule/app-clipboard: onChange nie je podporovaný poskytovateľom',
}
