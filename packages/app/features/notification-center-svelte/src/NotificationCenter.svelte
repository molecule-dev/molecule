<!--
  NotificationCenter: the Svelte counterpart of
  `@molecule/app-notification-center-react`'s `NotificationCenter`. Title (prop
  or snippet), mark-all-read action, error banner with retry, the item list
  with unread dot + tint, the empty-state branch (default, node or snippet) and
  the "View all" footer. Same props (React names), same DOM for the same input;
  every visible string goes through `t()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Alert, Button } from '@molecule/app-ui-svelte'

  import type { NotificationCenterProps } from './types.js'

  let {
    items,
    onMarkAllRead,
    onViewAll,
    emptyState,
    title,
    className,
    lastError,
    onRetry,
  }: NotificationCenterProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** React's `items.length > 0`. */
  const hasItems = $derived(items.length > 0)

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so this re-runs on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const defaultTitle = $derived(t('notifications.title', {}, { defaultValue: 'Notifications' }))
  const markAllText = $derived(
    t('notifications.markAllRead', {}, { defaultValue: 'Mark all as read' }),
  )
  const loadErrorText = $derived(
    t('notifications.loadError', {}, { defaultValue: 'Could not load notifications.' }),
  )
  const retryText = $derived(t('notifications.retry', {}, { defaultValue: 'Retry' }))
  const emptyText = $derived(t('notifications.empty', {}, { defaultValue: 'No notifications' }))
  const viewAllText = $derived(t('notifications.viewAll', {}, { defaultValue: 'View all' }))
  const unreadText = $derived(t('notifications.unread', {}, { defaultValue: 'Unread' }))
</script>

<div
  class={cm.cn(cm.stack(0 as const), className)}
  style="min-width: 320px; max-height: 480px; overflow-y: auto;"
>
  <header class={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'sm' }), cm.sp('p', 3))}>
    <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {#if title !== undefined && title !== null}
        {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
      {:else}{defaultTitle}{/if}
    </h3>
    {#if onMarkAllRead && hasItems}
      <Button variant="ghost" size="sm" onClick={onMarkAllRead}>{markAllText}</Button>
    {/if}
  </header>
  {#if lastError}
    <div class={cm.sp('px', 3)}>
      <Alert status="error">
        <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
          <span class={cm.textSize('sm')}>{loadErrorText}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            data-mol-id="notification-center-retry">{retryText}</Button
          >
        </div>
      </Alert>
    </div>
  {/if}
  {#if !hasItems}
    {#if emptyState !== undefined && emptyState !== null}
      {#if typeof emptyState === 'function'}{@render emptyState?.()}{:else}{emptyState}{/if}
    {:else}
      <div class={cm.cn(cm.sp('p', 6), cm.textCenter, cm.textSize('sm'))}>{emptyText}</div>
    {/if}
  {:else}
    <ul class={cm.stack(0 as const)}>
      {#each items as it (it.id)}
        <li>
          <!-- A `li` cannot take button semantics, so the row is a wrapper
            around its content: a button in the a11y tree (role + tabindex +
            Enter / Space activation) while the item is clickable, the plain
            row div otherwise. -->
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <!-- The role is a ternary on `it.onClick`, which the Svelte checker
            cannot resolve: it flags `tabindex` on a "non-interactive" div
            although `role="button"` (the valid WAI-ARIA button pattern) is
            exactly what the element carries while it is focusable. -->
          <div
            role={it.onClick ? 'button' : undefined}
            tabindex={it.onClick ? 0 : undefined}
            onclick={(event) => it.onClick?.(event)}
            onkeydown={(event) => {
              if (!it.onClick) return
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                it.onClick()
              }
            }}
            class={cm.cn(
              cm.flex({ align: 'start', gap: 'sm' }),
              cm.sp('px', 3),
              cm.sp('py', 2),
              it.onClick ? cm.cursorPointer : undefined,
              it.read ? undefined : cm.bgPrimarySubtle,
            )}
          >
            {#if it.leading}
              <div class={cm.shrink0}>
                {#if typeof it.leading === 'function'}{@render it.leading?.()}{:else}{it.leading}{/if}
              </div>
            {/if}
            <div class={cm.cn(cm.flex1, cm.stack(0 as const))}>
              <!-- The unread state is announced, not only shown: a screen reader
                reads "Unread" before the title (WCAG 1.3.1). -->
              {#if !it.read}<span class={cm.cn(cm.srOnly)}>{unreadText}</span>{/if}
              <span
                class={cm.cn(
                  cm.textSize('sm'),
                  it.read ? cm.fontWeight('medium') : cm.fontWeight('semibold'),
                )}
              >
                {#if typeof it.title === 'function'}{@render it.title?.()}{:else}{it.title}{/if}
              </span>
              {#if it.body}
                <span class={cm.textSize('xs')}>
                  {#if typeof it.body === 'function'}{@render it.body?.()}{:else}{it.body}{/if}
                </span>
              {/if}
              {#if it.timestamp}
                <span class={cm.textSize('xs')}>
                  {#if typeof it.timestamp === 'function'}{@render it.timestamp?.()}{:else}{it.timestamp}{/if}
                </span>
              {/if}
            </div>
            {#if !it.read}
              <span
                aria-hidden="true"
                class={cm.cn(cm.bgPrimary, cm.roundedFull)}
                style="width: 8px; height: 8px; margin-top: 6px;"
              ></span>
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  {/if}
  {#if onViewAll && hasItems}
    <footer class={cm.cn(cm.sp('p', 2), cm.textCenter)}>
      <Button variant="ghost" size="sm" onClick={onViewAll}>{viewAllText}</Button>
    </footer>
  {/if}
</div>
