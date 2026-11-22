<!--
  Keyboard shortcuts reference panel — displays all available shortcuts
  grouped by category with keyboard navigation.

  Svelte counterpart of `@molecule/app-ide-react`'s `KeyboardShortcutsPanel`
  (see that file for the design notes): the same props (React names), the
  same DOM for the same input, the same callbacks. Rows are grouped by the
  entries' category in first-occurrence order, the highlighted row follows
  the arrow keys and the pointer, Enter runs it, and Escape, the ✕ dismiss
  and the click-away backdrop all call `onDismiss`. The key listener sits on
  `document` in the capture phase, so the panel hears the keys wherever the
  focus is.

  The selected-row tint follows the theme primary (so a rebranded app tints
  its own picker), never a literal blue; the hex is only the CSS-var fallback.

  Styling uses `getClassMap()` (`cm.*`); the only inline styles are layout the
  ClassMap can't express. All user-facing text goes through `t()`.
-->
<script module lang="ts">
  import { SvelteMap } from 'svelte/reactivity'

  import type { KeyboardShortcutsPanelProps, ShortcutEntry } from '@molecule/app-ide-panel-logic'

  /** One category's rows and the flat index its first row holds. */
  interface ShortcutGroup {
    /** The category name (`''` for the uncategorized rows). */
    category: string
    /** The rows in that category, in prop order. */
    entries: ShortcutEntry[]
    /** The flat index of the group's first row (React's render counter). */
    start: number
  }

  /**
   * Groups shortcuts by category, preserving insertion order, and records the
   * flat index each group's first row renders at.
   *
   * @param shortcuts - Flat list of shortcut entries.
   * @returns The groups, in first-occurrence order, with their flat offsets.
   */
  function groupByCategory(shortcuts: ShortcutEntry[]): ShortcutGroup[] {
    const groups = new SvelteMap<string, ShortcutEntry[]>()
    for (const entry of shortcuts) {
      const cat = entry.category ?? ''
      const list = groups.get(cat)
      if (list) {
        list.push(entry)
      } else {
        groups.set(cat, [entry])
      }
    }
    const out: ShortcutGroup[] = []
    let start = 0
    for (const [category, entries] of groups) {
      out.push({ category, entries, start })
      start += entries.length
    }
    return out
  }

  /**
   * The badge's inline style for a theme (React's `KeyBadge` `kbd`).
   *
   * @param light - Whether the light theme is active.
   * @returns The style attribute text.
   */
  function badgeStyle(light: boolean): string {
    return `display: inline-block; padding: 2px 6px; font-size: 11px; font-family: system-ui, sans-serif; line-height: 16px; border-radius: 4px; border: 1px solid ${
      light ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'
    }; background: ${light ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)'}; color: var(--mol-color-text, currentColor); min-width: 20px; text-align: center`
  }
</script>

<script lang="ts">
  import { useThemeMode, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  let { shortcuts, onDismiss }: KeyboardShortcutsPanelProps = $props()

  const { t } = useTranslation()
  const mode = useThemeMode()

  let selectedIndex = $state(0)
  let panelEl = $state<HTMLDivElement | null>(null)
  let listEl = $state<HTMLDivElement | null>(null)

  const cm = $derived(getClassMap())
  const light = $derived($mode === 'light')

  // The rows grouped by category, in first-occurrence order, with their flat
  // offsets — and the flat list for keyboard navigation indexing.
  const groups = $derived.by(() => groupByCategory(shortcuts))
  const flatEntries = $derived(groups.flatMap((group) => group.entries))

  // The selected-row tint follows the theme primary (so a rebranded app tints
  // its own picker), never a literal blue; the hex is only the CSS-var fallback.
  const selectedBg = $derived(
    $mode === 'light'
      ? 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 12%, transparent)'
      : 'color-mix(in srgb, var(--mol-color-primary, #4070e0) 25%, transparent)',
  )

  // Focus the panel so keyboard events work immediately
  $effect(() => {
    panelEl?.focus()
  })

  // Scroll selected item into view
  $effect(() => {
    const buttons = listEl?.querySelectorAll('[data-shortcut-row]')
    const el = buttons?.[selectedIndex] as HTMLElement | undefined
    el?.scrollIntoView({ block: 'nearest' })
  })

  // React re-subscribes when its handler identity changes; the state reads
  // make this handler always current, so one subscribe for the component's
  // life is the same behavior.
  $effect(() => {
    document.addEventListener('keydown', handleKeyDown, true)
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
    }
  })

  /**
   * The keyboard navigation: the arrows move the highlight over the flat
   * row order (clamped), Enter runs the highlighted row when it has a
   * handler, Escape dismisses. Bound on `document` in the capture phase,
   * so the panel hears the keys wherever the focus is.
   *
   * @param event - The key press.
   */
  function handleKeyDown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        event.preventDefault()
        onDismiss()
        break
      case 'ArrowDown':
        event.preventDefault()
        selectedIndex = Math.min(selectedIndex + 1, flatEntries.length - 1)
        break
      case 'ArrowUp':
        event.preventDefault()
        selectedIndex = Math.max(selectedIndex - 1, 0)
        break
      case 'Enter': {
        event.preventDefault()
        const entry = flatEntries[selectedIndex]
        if (entry?.execute) {
          entry.execute()
          onDismiss()
        }
        break
      }
    }
  }
</script>

<!-- Backdrop: role="presentation" — a sibling click-away surface that receives
     only its own clicks; the key handling lives on `document` in the capture
     phase, as React's does. -->
<div
  role="presentation"
  onclick={onDismiss}
  style="position: fixed; inset: 0px; z-index: 1000; background: rgba(0, 0, 0, 0.4)"
></div>
<!-- Panel -->
<div
  bind:this={panelEl}
  tabindex="-1"
  style={`position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 480px; max-width: 90vw; max-height: 70vh; z-index: 1001; border-radius: 8px; overflow: hidden; box-shadow: ${
    $mode === 'light' ? '0 8px 32px rgba(0,0,0,0.18)' : '0 8px 32px rgba(0,0,0,0.6)'
  }; background: ${
    $mode === 'light' ? '#fff' : 'var(--mol-color-background, #1e1e1e)'
  }; border: 1px solid var(--color-border, #333); display: flex; flex-direction: column; outline: none`}
>
  <!-- Header -->
  <div
    style="display: flex; align-items: center; justify-content: space-between; padding: 14px 16px 10px; border-bottom: 1px solid var(--color-border, #333); flex-shrink: 0"
  >
    <span style="font-size: 14px; font-weight: 600">
      {t('ide.shortcuts.title', undefined, { defaultValue: 'Keyboard Shortcuts' })}
    </span>
    <!-- mol-bespoke-button: icon-only ✕ panel dismiss — the IDE's one
        dismiss mark (same SVG, same 4px-radius square box, same hover
        scrim as the tab close and the chat-card dismisses), on the full
        44px coarse floor DESIGN.md reserves for icon-only ✕ dismisses.
        It was a bare text × with no label and no hit floor. -->
    <button
      type="button"
      data-mol-id="shortcuts-close"
      onclick={onDismiss}
      aria-label={t('ide.shortcuts.close', undefined, { defaultValue: 'Close' })}
      title={t('ide.shortcuts.close', undefined, { defaultValue: 'Close' })}
      class={cm.cn(cm.touchTarget, cm.shrink0)}
      style="display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 4px; border: medium; background: transparent; color: inherit; cursor: pointer; opacity: 0.6; transition: opacity 100ms, background 100ms"
      onmouseenter={(e) => {
        e.currentTarget.style.opacity = '1'
        e.currentTarget.style.background = 'rgba(128,128,128,0.2)'
      }}
      onmouseleave={(e) => {
        e.currentTarget.style.opacity = '0.6'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M3 3l10 10M13 3L3 13"
          stroke="currentColor"
          stroke-width="1.6"
          stroke-linecap="round"
        ></path>
      </svg>
    </button>
  </div>

  <!-- Shortcut list -->
  <div bind:this={listEl} style="flex: 1 1 0%; overflow: auto; padding: 8px 0px">
    {#each groups as group (group.category)}
      <div>
        {#if group.category}
          <div
            style="padding: 8px 16px 4px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: var(--mol-color-text-secondary, #888)"
          >
            {group.category}
          </div>
        {/if}
        {#each group.entries as entry, j (entry.label)}
          {@const idx = group.start + j}
          <!-- The selected-row tint goes through a directive: a one-shot
               style-attribute parse drops `background: transparent`, the way
               QuickPicker's border image does. -->
          <button
            type="button"
            data-shortcut-row="true"
            data-mol-id={`shortcut-row-${idx}`}
            onclick={() => {
              if (entry.execute) {
                entry.execute()
                onDismiss()
              }
            }}
            onmouseenter={() => {
              selectedIndex = idx
            }}
            class={cm.touchTargetCompact}
            style:background={idx === selectedIndex ? selectedBg : 'transparent'}
            style={`display: flex; align-items: center; justify-content: space-between; padding: 6px 16px; font-size: 13px; width: 100%; border: none; color: var(--mol-color-text, currentColor); cursor: ${
              entry.execute ? 'pointer' : 'default'
            }; text-align: left; border-radius: 0px`}
          >
            <span>{entry.label}</span>
            <span style="display: flex; gap: 4px; flex-shrink: 0; margin-left: 16px">
              {#each entry.keys.split(' ') as part, i (i)}
                <kbd style={badgeStyle(light)}>{part}</kbd>
              {/each}
            </span>
          </button>
        {/each}
      </div>
    {/each}
  </div>

  <!-- Footer hint -->
  <div
    style="padding: 8px 16px; border-top: 1px solid var(--color-border, #333); font-size: 11px; color: var(--mol-color-text-secondary, #888); text-align: center; flex-shrink: 0"
  >
    {t('ide.shortcuts.hint', undefined, {
      defaultValue: 'Arrow keys to navigate · Enter to run · Esc to close',
    })}
  </div>
</div>
