/** The DOM paste adapter shared by containers and text fields. */
import type { ClipboardEventHandler } from 'react'

/** Consumes the first nonempty plain-text paste handled on the bubble path. */
export function pasteHandler(
  onPasteText: ((text: string) => void) | undefined,
): ClipboardEventHandler | undefined {
  if (!onPasteText) return undefined
  return (event) => {
    if (event.defaultPrevented) return
    const text = event.clipboardData.getData('text/plain')
    if (text === '') return
    event.preventDefault()
    onPasteText(text)
  }
}
