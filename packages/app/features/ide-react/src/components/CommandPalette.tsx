/**
 * Command Palette (Cmd+Shift+P) — searchable command list overlay.
 *
 * @module
 */

import type { JSX } from 'react'
import { useMemo } from 'react'

import { t } from '@molecule/app-i18n'

import type { CommandPaletteProps, QuickPickerItem } from '../types.js'
import { QuickPicker } from './QuickPicker.js'

/**
 * Command Palette overlay.
 *
 * @param root0 - The component props.
 * @param root0.commands - Array of available commands.
 * @param root0.onDismiss - Called when the palette is dismissed.
 * @returns The command palette element.
 */
export function CommandPalette({ commands, onDismiss }: CommandPaletteProps): JSX.Element {
  const items: QuickPickerItem[] = useMemo(
    () =>
      commands.map((cmd) => ({
        id: cmd.id,
        label: cmd.category ? `${cmd.category}: ${cmd.label}` : cmd.label,
        detail: cmd.shortcut,
      })),
    [commands],
  )

  const commandMap = useMemo(() => {
    const map = new Map<string, () => void>()
    for (const cmd of commands) {
      map.set(cmd.id, cmd.execute)
    }
    return map
  }, [commands])

  return (
    <QuickPicker
      items={items}
      placeholder={t('ide.commandPalette.placeholder', undefined, { defaultValue: 'Type a command…' })}
      onSelect={(item) => {
        const handler = commandMap.get(item.id)
        handler?.()
        onDismiss()
      }}
      onDismiss={onDismiss}
    />
  )
}

CommandPalette.displayName = 'CommandPalette'
