<!--
  CommandPalette: the Svelte counterpart of `@molecule/app-ide-react`'s
  `CommandPalette` (see that file for the design notes) — the ⌘⇧P overlay: a
  searchable list of the app's commands over a click-away backdrop. Same props
  (React names), same DOM for the same input, same callbacks. The rows are
  derived from the commands — a `category: label` prefix, the shortcut as the
  detail beside the label — and selecting one (Enter on the highlighted row,
  or a click) runs its handler and dismisses the palette; Escape and the
  backdrop dismiss without running anything.

  The overlay itself — the filter, the keyboard, the rows — is the package's
  `QuickPicker`; the palette hands it the derived items and its OWN placeholder
  translation, so the picker's default never shows through it.

  All user-facing text goes through `t()`.
-->
<script lang="ts">
  import { SvelteMap } from 'svelte/reactivity'

  import type { CommandPaletteProps } from '@molecule/app-ide-panel-logic'
  import { useTranslation } from '@molecule/app-svelte'

  import QuickPicker, { type QuickPickerItem } from './QuickPicker.svelte'

  let { commands, onDismiss }: CommandPaletteProps = $props()

  const { t } = useTranslation()

  // The rows QuickPicker renders: `category: label`, the shortcut as detail
  // (React's `items` memo — recomputed when the commands are re-passed).
  const items = $derived<QuickPickerItem[]>(
    commands.map((cmd) => ({
      id: cmd.id,
      label: cmd.category ? `${cmd.category}: ${cmd.label}` : cmd.label,
      detail: cmd.shortcut,
    })),
  )

  // The handlers by command id, so a selection runs the CURRENT command of
  // that row (React's `commandMap` memo).
  const commandMap = $derived.by(() => {
    const map = new SvelteMap<string, () => void>()
    for (const cmd of commands) map.set(cmd.id, cmd.execute)
    return map
  })
</script>

<QuickPicker
  {items}
  placeholder={t('ide.commandPalette.placeholder', undefined, { defaultValue: 'Type a command…' })}
  onSelect={(item: QuickPickerItem) => {
    commandMap.get(item.id)?.()
    onDismiss()
  }}
  {onDismiss}
/>
