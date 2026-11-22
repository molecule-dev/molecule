/**
 * Command Palette (⌘⇧P) — searchable command list overlay.
 *
 * Vue counterpart of `@molecule/app-ide-react`'s `CommandPalette` (see that
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
 *
 * All user-facing text goes through `t()`.
 *
 * @module
 */

import { computed, defineComponent, h, type PropType, type VNodeChild } from 'vue'

import type { Command } from '@molecule/app-ide-panel-logic'
import { useTranslation } from '@molecule/app-vue'

import type { QuickPickerItem } from './QuickPicker.js'
import { QuickPicker } from './QuickPicker.js'

/**
 * Command palette overlay over the package's QuickPicker — `CommandPaletteProps`
 * (`@molecule/app-ide-panel-logic`): `commands` and `onDismiss`.
 *
 * @param props - The `commands` and `onDismiss` props, React's names.
 * @returns The rendered command palette.
 */
export const CommandPalette = defineComponent({
  name: 'CommandPalette',
  inheritAttrs: false,
  props: {
    /** Available commands. */
    commands: { type: Array as PropType<Command[]>, required: true },
    /** Called when the palette is dismissed. */
    onDismiss: { type: Function as PropType<() => void>, required: true },
  },
  setup(props) {
    const { t } = useTranslation()

    // The rows QuickPicker renders: `category: label`, the shortcut as detail
    // (React's `items` memo — recomputed when the commands are re-passed).
    const items = computed<QuickPickerItem[]>(() =>
      props.commands.map((cmd) => ({
        id: cmd.id,
        label: cmd.category ? `${cmd.category}: ${cmd.label}` : cmd.label,
        detail: cmd.shortcut,
      })),
    )

    // The handlers by command id, so a selection runs the CURRENT command of
    // that row (React's `commandMap` memo).
    const commandMap = computed(() => {
      const map = new Map<string, () => void>()
      for (const cmd of props.commands) map.set(cmd.id, cmd.execute)
      return map
    })

    return (): VNodeChild =>
      h(QuickPicker, {
        items: items.value,
        placeholder: t('ide.commandPalette.placeholder', undefined, {
          defaultValue: 'Type a command…',
        }),
        onSelect: (item: QuickPickerItem) => {
          commandMap.value.get(item.id)?.()
          props.onDismiss()
        },
        onDismiss: props.onDismiss,
      })
  },
})
