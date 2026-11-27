/** Plain-text paste ownership and the native clipboard command. */
import { createContext } from 'react'
import { Alert, type NativeSyntheticEvent } from 'react-native'

import { readText } from '@molecule/app-clipboard'
import { t } from '@molecule/app-i18n'

type PasteText = (text: string) => void

/** A paste subscription and the native command that uses it. */
export interface PasteOwner {
  handlePaste: PasteText
  label: string
  activate(): void
  showMenu(): void
}

/** The nearest Box that subscribed to plain-text paste. */
export const PasteScope = createContext<PasteOwner | undefined>(undefined)

/** Reads the clipboard only in response to an explicitly activated Paste command. */
async function pasteFromClipboard(handlePaste: PasteText): Promise<void> {
  let text: string
  try {
    text = await readText()
  } catch (_error) {
    // An unbonded provider or denied clipboard read leaves the selected cells unchanged.
    return
  }
  if (text !== '') handlePaste(text)
}

/** Prepares a localized Paste command for the box and its focused children. */
export function boxPasteOwner(handlePaste: PasteText): PasteOwner {
  const label = t('ui.paste', undefined, { defaultValue: 'Paste' })
  const activate = (): void => {
    void pasteFromClipboard(handlePaste)
  }
  return {
    handlePaste,
    label,
    activate,
    showMenu: () =>
      Alert.alert(label, undefined, [
        { text: t('confirm.cancel', undefined, { defaultValue: 'Cancel' }), style: 'cancel' },
        { text: label, onPress: activate },
      ]),
  }
}

/** Props recognized by the RN 0.79.6 command adapter in the parked native kit. */
export function nativePasteProps(onPaste: PasteText | undefined): {
  consumePlainTextPaste?: true
  onPlainTextPaste?: (event: NativeSyntheticEvent<{ text: string }>) => void
} {
  if (!onPaste) return {}
  return {
    consumePlainTextPaste: true,
    onPlainTextPaste: (event: NativeSyntheticEvent<{ text: string }>): void => {
      const { text } = event.nativeEvent
      if (text !== '') onPaste(text)
    },
  }
}
