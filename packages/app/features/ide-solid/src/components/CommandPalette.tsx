/**
 * Command Palette (⌘⇧P) — searchable command list overlay.
 *
 * Solid counterpart of `@molecule/app-ide-react`'s `CommandPalette` (see that
 * file for the design notes): the same props (React names), the same DOM for
 * the same input, the same callbacks. The rows are derived from the commands —
 * a `category: label` prefix, the shortcut as the detail beside the label —
 * and selecting one (Enter on the highlighted row, or a click) runs its
 * handler and dismisses the palette; Escape and the backdrop dismiss without
 * running anything.
 *
 * The overlay itself — the filter, the keyboard, the rows — is the package's
 * `QuickPicker`; the palette hands it the derived items and its OWN
 * placeholder translation, so the picker's default never shows through it.
 * The props are read as `props.…` inside the memos (never destructured), so a
 * re-passed `commands` prop re-derives the rows the way React's memo does.
 *
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import type { JSX } from 'solid-js'
import { createMemo } from 'solid-js'

import type { CommandPaletteProps } from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-solid'

import type { QuickPickerItem } from './QuickPicker.jsx'
import { QuickPicker } from './QuickPicker.jsx'

/**
 * Command palette overlay over the package's QuickPicker.
 *
 * @param props - See {@link CommandPaletteProps}.
 * @returns The rendered command palette.
 */
export function CommandPalette(props: CommandPaletteProps): JSX.Element {
  const { t } = useTranslation()

  // The rows QuickPicker renders: `category: label`, the shortcut as detail
  // (React's `items` memo — recomputed when the commands are re-passed).
  const items = createMemo<QuickPickerItem[]>(() =>
    props.commands.map((cmd) => ({
      id: cmd.id,
      label: cmd.category ? `${cmd.category}: ${cmd.label}` : cmd.label,
      detail: cmd.shortcut,
    })),
  )

  // The handlers by command id, so a selection runs the CURRENT command of
  // that row (React's `commandMap` memo).
  const commandMap = createMemo(() => {
    const map = new Map<string, () => void>()
    for (const cmd of props.commands) map.set(cmd.id, cmd.execute)
    return map
  })

  return (
    <QuickPicker
      items={items()}
      placeholder={t('ide.commandPalette.placeholder', undefined, {
        defaultValue: 'Type a command…',
      })}
      onSelect={(item) => {
        commandMap().get(item.id)?.()
        props.onDismiss()
      }}
      onDismiss={props.onDismiss}
    />
  )
}
