<!--
  AnnouncementBar: the Svelte counterpart of
  `@molecule/app-announcement-bar-react`'s `AnnouncementBar` — persistent
  top-of-page banner with icon, message, optional action (link or button), and
  optional dismiss (×). Same props, same DOM for the same input; node props are
  snippets (or plain strings) and every visible string goes through `t()` so a
  locale switch re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { AnnouncementBarProps } from './types.js'

  let {
    children,
    icon,
    action,
    kind = 'info',
    dismissible = true,
    onDismiss,
    visible,
    className,
    dataMolId,
  }: AnnouncementBarProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let internalVisible = $state(true)

  /** React's `visible ?? internalVisible`. */
  const isVisible = $derived(visible ?? internalVisible)
  /** The action's shared class list. */
  const actionClasses = $derived(cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'), cm.link))
  /** The inner rows' class (`cm.flex({ align: 'center', gap: 'sm' })`). */
  const rowClasses = $derived(cm.flex({ align: 'center', gap: 'sm' }))
  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so this re-runs on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const dismissLabel = $derived(t('announcement.dismiss', {}, { defaultValue: 'Dismiss' }))

  /** Hides the bar (internal state) and fires the onDismiss callback. */
  function dismiss(): void {
    if (visible === undefined) internalVisible = false
    onDismiss?.()
  }
</script>

{#if isVisible}
  <div
    role="status"
    data-mol-id={dataMolId}
    data-kind={kind}
    class={cm.cn(
      cm.flex({ align: 'center', justify: 'between', gap: 'md', wrap: 'wrap' }),
      cm.sp('px', 4),
      cm.sp('py', 2),
      className,
    )}
  >
    <div class={rowClasses}>
      {#if typeof icon === 'function'}{@render icon()}{:else if icon !== undefined}{icon}{/if}
      <span class={cm.textSize('sm')}>{@render children()}</span>
    </div>
    <div class={rowClasses}>
      {#if action}
        {#if action.href}
          <a href={action.href} class={actionClasses}>
            {#if typeof action.label === 'function'}{@render action.label()}{:else}{action.label}{/if}
          </a>
        {:else}
          <button type="button" onclick={action.onClick} class={actionClasses}>
            {#if typeof action.label === 'function'}{@render action.label()}{:else}{action.label}{/if}
          </button>
        {/if}
      {/if}
      {#if dismissible}
        <button
          type="button"
          onclick={dismiss}
          aria-label={dismissLabel}
          class={cm.cn(cm.w(6), cm.h(6), cm.flex({ align: 'center', justify: 'center' }))}
        >
          ×
        </button>
      {/if}
    </div>
  </div>
{/if}
