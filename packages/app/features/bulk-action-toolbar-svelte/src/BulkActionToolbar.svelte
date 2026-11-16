<!--
  BulkActionToolbar: the Svelte counterpart of
  `@molecule/app-bulk-action-toolbar-react`'s `BulkActionToolbar` — the same
  props (React names), the same DOM for the same input. Renders nothing while
  `count <= 0`. React keys each action button by the action's `id`; the keyed
  `{#each}` moves/keeps the rendered buttons per key the same way.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import { reactStyle } from './style.js'
  import type { BulkActionToolbarProps } from './types.js'

  let {
    count,
    actions,
    onClearSelection,
    position = 'sticky-bottom',
    className,
  }: BulkActionToolbarProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())

  // The toolbar's accessible name: `t()` with the English default
  // `'Bulk actions'`, so a locale switch re-renders the label.
  const toolbarLabel = $derived(t('bulkActions.aria.toolbar', {}, { defaultValue: 'Bulk actions' }))

  // React's sticky inline style for the current position — undefined for
  // `'inline'`, the way React leaves the style off.
  const stickyStyle = $derived(
    position === 'sticky-bottom'
      ? { position: 'sticky', bottom: '16px', zIndex: 30 }
      : position === 'sticky-top'
        ? { position: 'sticky', top: '16px', zIndex: 30 }
        : undefined,
  )
</script>

{#if count > 0}
  <div
    role="region"
    aria-label={toolbarLabel}
    class={cm.cn(
      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
      cm.sp('px', 3),
      cm.sp('py', 2),
      className,
    )}
    use:reactStyle={stickyStyle}
  >
    <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {t('bulkActions.selected', { count }, { defaultValue: '{{count}} selected' })}
    </span>
    <div class={cm.flex({ align: 'center', gap: 'sm' })}>
      {#each actions as action (action.id)}
        <Button
          variant={action.destructive ? 'solid' : 'ghost'}
          color={action.destructive ? 'error' : undefined}
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
        >
          {#if typeof action.icon === 'function'}{@render action.icon()}{:else if action.icon != null}{action.icon}{/if}{#if action.label}
            <span>
              {#if typeof action.label === 'function'}{@render action.label()}{:else}{action.label}{/if}
            </span>
          {/if}
        </Button>
      {/each}
      {#if onClearSelection}
        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          {t('bulkActions.clear', {}, { defaultValue: 'Clear' })}
        </Button>
      {/if}
    </div>
  </div>
{/if}
