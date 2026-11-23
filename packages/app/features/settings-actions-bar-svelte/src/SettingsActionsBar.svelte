<!--
  SettingsActionsBar: the Svelte counterpart of
  `@molecule/app-settings-actions-bar-react`'s `SettingsActionsBar` — a sticky
  bottom / inline Save-Cancel bar for settings and forms. Same props, same DOM
  for the same input: a primary Save button with loading/disabled state, an
  optional Cancel button (hidden when `onCancel` is omitted), a "Saved Xm ago"
  badge when `savedAt` is provided, inline error text and an optional leading
  slot.

  The template's whitespace is deliberate: React renders no whitespace text
  between the bar's children, so every element sits on its own line with only
  the block markers ({#if}) between siblings, and node-valued props go through
  the `node` snippet, which passes a plain string through verbatim and renders
  a snippet's nodes.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { ReactNodeProp } from './node-prop.js'
  import type { SettingsActionsBarProps } from './types.js'

  let {
    onSave,
    onCancel,
    loading = false,
    disabled = false,
    savedAt,
    error,
    sticky = true,
    leading,
    className,
  }: SettingsActionsBarProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /**
   * Formats an epoch-ms timestamp as a short human-readable relative string
   * (e.g. "3m ago") — React's `formatRelativeShort`, verbatim.
   *
   * @param epochMs - The timestamp, in epoch milliseconds.
   * @returns The shorthand relative time.
   */
  function formatRelativeShort(epochMs: number): string {
    const s = Math.floor((Date.now() - epochMs) / 1000)
    if (s < 5) return 'just now'
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
  }

  // React's `savedAt !== null && savedAt !== undefined` guard: an epoch-ms 0
  // still shows the badge, while null/undefined hide it.
  const savedText = $derived(
    savedAt === null || savedAt === undefined ? null : formatRelativeShort(savedAt),
  )

  // React's sticky inline style. The declaration order and values are the ones
  // react-dom writes to the CSSOM.
  const stickyStyle = 'position: sticky; bottom: 0; z-index: 5'
</script>

{#snippet node(value: ReactNodeProp | undefined)}
  {#if typeof value === 'function'}{@render value?.()}{:else}{value ?? ''}{/if}
{/snippet}

<div
  class={cm.cn(
    // A real theme surface + top border so the (sticky) bar is opaque and page
    // content no longer shows through it while scrolling. Both are theme
    // tokens, never hardcoded colors, so light/dark stay correct.
    cm.surface,
    cm.borderT,
    cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
    cm.sp('px', 4),
    cm.sp('py', 3),
    className,
  )}
  style={sticky ? stickyStyle : undefined}
>
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    {@render node(leading)}{#if savedText !== null}<span
        class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
        >{t('settingsActions.saved', { at: savedText }, { defaultValue: 'Saved {{at}}' })}</span
      >{/if}{#if error}<span class={cm.textSize('sm')}>{@render node(error)}</span>{/if}
  </div>
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    {#if onCancel}<Button
        variant="ghost"
        onClick={(event: MouseEvent) => onCancel?.(event)}
        disabled={loading}>{t('settingsActions.cancel', {}, { defaultValue: 'Cancel' })}</Button
      >{/if}<Button
      variant="solid"
      color="primary"
      onClick={() => void onSave()}
      disabled={loading || disabled}
      >{loading
        ? t('settingsActions.saving', {}, { defaultValue: 'Saving…' })
        : t('settingsActions.save', {}, { defaultValue: 'Save changes' })}</Button
    >
  </div>
</div>
