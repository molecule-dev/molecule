<!--
  ModerationQueue: the Svelte counterpart of
  `@molecule/app-moderation-queue-react`'s `ModerationQueue` — a list of
  flagged items with kind icon, content preview, reason chip, severity color,
  per-row action buttons (approve / reject / escalate / mute), and a
  bulk-select toolbar (select-all checkbox + apply-to-selected action
  buttons). Same props (React names), same DOM for the same input.

  React keys each row by `item.id`, so the keyed `{#each}` moves/keeps the
  rendered row per id the same way.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import { reflectChecked } from './checked.js'
  import { severityColor } from './severity.js'
  import type {
    ModerationBulkAction,
    ModerationItem,
    ModerationItemKind,
    ModerationItemSeverity,
    ModerationQueueProps,
  } from './types.js'

  let {
    items,
    onApprove,
    onReject,
    onEscalate,
    onMute,
    onBulkAction,
    loading = false,
    emptyState,
    className,
  }: ModerationQueueProps = $props()

  const cm = $derived(getClassMap())
  // Read inside the markup, so every string follows a locale switch.
  const { t } = useTranslation()

  const KIND_GLYPH: Record<ModerationItemKind, string> = {
    post: '\u{1F4DD}',
    comment: '\u{1F4AC}',
    image: '\u{1F5BC}',
    message: '✉',
    profile: '\u{1F464}',
  }

  let selected = $state<string[]>([])

  const ids = $derived(items.map((item) => item.id))
  const allSelected = $derived(ids.length > 0 && ids.every((id) => selected.includes(id)))
  const someSelected = $derived(!allSelected && ids.some((id) => selected.includes(id)))
  const selectionCount = $derived(ids.filter((id) => selected.includes(id)).length)

  /**
   * Toggles one item's selection (React's `toggleOne`).
   * @param id - The item id.
   */
  function toggleOne(id: string): void {
    selected = selected.includes(id) ? selected.filter((value) => value !== id) : [...selected, id]
  }

  /**
   * Selects every item, or clears the selection when all are selected
   * (React's `toggleAll`).
   */
  function toggleAll(): void {
    selected = allSelected ? [] : [...ids]
  }

  /**
   * Applies a bulk action to the selected ids and clears the selection
   * (React's `applyBulk`).
   * @param action - The bulk action.
   */
  function applyBulk(action: ModerationBulkAction): void {
    const picked = selected.filter((id) => ids.includes(id))
    if (picked.length === 0) return
    onBulkAction?.(action, picked)
    selected = []
  }

  /**
   * Kind label — one literal `t()` call per `ModerationItemKind` value.
   * @param kind - Item kind.
   * @returns The translated kind label.
   */
  function kindLabel(kind: ModerationItemKind): string {
    switch (kind) {
      case 'post':
        return t('moderationQueue.kind.post', {}, { defaultValue: 'Post' })
      case 'comment':
        return t('moderationQueue.kind.comment', {}, { defaultValue: 'Comment' })
      case 'image':
        return t('moderationQueue.kind.image', {}, { defaultValue: 'Image' })
      case 'message':
        return t('moderationQueue.kind.message', {}, { defaultValue: 'Message' })
      case 'profile':
        return t('moderationQueue.kind.profile', {}, { defaultValue: 'Profile' })
    }
  }

  /**
   * Severity label — one literal `t()` call per `ModerationItemSeverity` value.
   * @param severity - Severity bucket.
   * @returns The translated severity label.
   */
  function severityLabel(severity: ModerationItemSeverity): string {
    switch (severity) {
      case 'low':
        return t('moderationQueue.severity.low', {}, { defaultValue: 'Low' })
      case 'medium':
        return t('moderationQueue.severity.medium', {}, { defaultValue: 'Medium' })
      case 'high':
        return t('moderationQueue.severity.high', {}, { defaultValue: 'High' })
    }
  }

  /**
   * The ClassMap text-color token of a severity (React's `sevToken` map: there
   * is no token for secondary/info, so those fall back to `textPrimary`).
   * @param item - The flagged item.
   * @returns The class string.
   */
  function severityClasses(item: ModerationItem): string {
    const token: Record<string, string> = {
      primary: cm.textPrimary,
      secondary: cm.textPrimary,
      success: cm.textSuccess,
      warning: cm.textWarning,
      error: cm.textError,
      info: cm.textPrimary,
    }
    return cm.cn(cm.fontWeight('semibold'), token[severityColor(item.severity)])
  }
</script>

{#snippet node(value: Snippet | string | undefined)}
  {#if typeof value === 'function'}{@render value()}{:else if value !== undefined && value !== null}{value}{/if}
{/snippet}

{#if loading}
  <div
    role="status"
    aria-live="polite"
    data-mol-id="moderation-queue-loading"
    class={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 4), className)}
  >
    <span>{t('moderationQueue.loading', {}, { defaultValue: 'Loading moderation queue…' })}</span>
  </div>
{:else if items.length === 0}
  <div
    role="status"
    data-mol-id="moderation-queue-empty"
    class={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('p', 6), className)}
  >
    {#if emptyState !== undefined && emptyState !== null}
      {@render node(emptyState)}
    {:else}
      <span class={cm.cn(cm.textSize('sm'))}>
        {t('moderationQueue.empty', {}, { defaultValue: 'No items awaiting moderation.' })}
      </span>
    {/if}
  </div>
{:else}
  <div
    role="region"
    aria-label={t('moderationQueue.aria.region', {}, { defaultValue: 'Moderation queue' })}
    data-mol-id="moderation-queue"
    class={cm.cn(cm.stack(2), className)}
  >
    <div
      role="toolbar"
      aria-label={t(
        'moderationQueue.aria.bulkToolbar',
        {},
        { defaultValue: 'Bulk moderation actions' },
      )}
      data-mol-id="moderation-queue-bulk-toolbar"
      class={cm.cn(
        cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
        cm.sp('px', 3),
        cm.sp('py', 2),
      )}
    >
      <label
        class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('sm'))}
        data-mol-id="moderation-queue-select-all-label"
        ><input
          type="checkbox"
          use:reflectChecked={{ checked: allSelected, indeterminate: someSelected }}
          onchange={toggleAll}
          data-mol-id="moderation-queue-select-all"
          aria-label={t('moderationQueue.aria.selectAll', {}, { defaultValue: 'Select all' })}
        /><span
          >{#if selectionCount > 0}{t(
              'moderationQueue.selectedCount',
              { count: selectionCount },
              { defaultValue: '{{count}} selected' },
            )}{:else}{t('moderationQueue.selectAll', {}, { defaultValue: 'Select all' })}{/if}</span
        >
      </label>
      {#if onBulkAction}
        <div
          class={cm.flex({ align: 'center', gap: 'sm' })}
          data-mol-id="moderation-queue-bulk-actions"
        >
          <Button
            variant="ghost"
            size="sm"
            color="success"
            disabled={selectionCount === 0}
            onClick={() => applyBulk('approve')}
            data-mol-id="moderation-queue-bulk-approve"
            >{t('moderationQueue.bulk.approve', {}, { defaultValue: 'Approve' })}</Button
          >
          <Button
            variant="ghost"
            size="sm"
            color="error"
            disabled={selectionCount === 0}
            onClick={() => applyBulk('reject')}
            data-mol-id="moderation-queue-bulk-reject"
            >{t('moderationQueue.bulk.reject', {}, { defaultValue: 'Reject' })}</Button
          >
          {#if onEscalate}
            <Button
              variant="ghost"
              size="sm"
              color="warning"
              disabled={selectionCount === 0}
              onClick={() => applyBulk('escalate')}
              data-mol-id="moderation-queue-bulk-escalate"
              >{t('moderationQueue.bulk.escalate', {}, { defaultValue: 'Escalate' })}</Button
            >
          {/if}
          {#if onMute}
            <Button
              variant="ghost"
              size="sm"
              color="secondary"
              disabled={selectionCount === 0}
              onClick={() => applyBulk('mute')}
              data-mol-id="moderation-queue-bulk-mute"
              >{t('moderationQueue.bulk.mute', {}, { defaultValue: 'Mute' })}</Button
            >
          {/if}
        </div>
      {/if}
    </div>
    <ul
      class={cm.cn(cm.stack(2))}
      data-mol-id="moderation-queue-list"
      style="list-style: none; margin: 0px; padding: 0px"
    >
      {#each items as item (item.id)}
        <li
          data-mol-id="moderation-queue-row"
          data-mol-row-id={item.id}
          data-mol-kind={item.kind}
          data-mol-severity={item.severity ?? 'unspecified'}
          class={cm.cn(cm.flex({ align: 'start', gap: 'md' }), cm.sp('p', 3))}
        >
          <input
            type="checkbox"
            use:reflectChecked={{ checked: selected.includes(item.id) }}
            onchange={() => toggleOne(item.id)}
            data-mol-id="moderation-queue-row-select"
            aria-label={t('moderationQueue.aria.selectRow', {}, { defaultValue: 'Select item' })}
          />
          <span
            aria-hidden="true"
            data-mol-id="moderation-queue-row-kind-icon"
            class={cm.cn(cm.textSize('lg'))}
          >
            {KIND_GLYPH[item.kind]}
          </span>
          <div class={cm.cn(cm.flex1, cm.stack(1))}>
            <div
              class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
              data-mol-id="moderation-queue-row-meta"
            >
              <span class={cm.fontWeight('semibold')}>{kindLabel(item.kind)}</span>
              {#if item.severity}
                <span data-mol-id="moderation-queue-row-severity" class={severityClasses(item)}>
                  {severityLabel(item.severity)}
                </span>
              {/if}
              {#if item.reportedBy}
                <span data-mol-id="moderation-queue-row-reported-by">
                  {t('moderationQueue.reportedBy', {}, { defaultValue: 'Reported by' })}&#32;<span
                    class={cm.fontWeight('semibold')}>{@render node(item.reportedBy)}</span
                  >
                </span>
              {/if}
              <span data-mol-id="moderation-queue-row-reported-at">
                {@render node(item.reportedAt)}
              </span>
            </div>
            <div data-mol-id="moderation-queue-row-preview" class={cm.cn(cm.textSize('sm'))}>
              {@render node(item.preview)}
            </div>
            <div
              data-mol-id="moderation-queue-row-reason"
              class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.textSize('xs'))}
            >
              <span class={cm.fontWeight('semibold')}
                >{t('moderationQueue.reason', {}, { defaultValue: 'Reason' })}:</span
              >
              <span>{@render node(item.reason)}</span>
            </div>
          </div>
          <div
            class={cm.flex({ align: 'center', gap: 'sm' })}
            data-mol-id="moderation-queue-row-actions"
          >
            <Button
              size="sm"
              variant="ghost"
              color="success"
              onClick={() => onApprove(item.id)}
              data-mol-id="moderation-queue-row-approve"
              aria-label={t('moderationQueue.aria.approve', {}, { defaultValue: 'Approve' })}
              >{t('moderationQueue.action.approve', {}, { defaultValue: 'Approve' })}</Button
            >
            <Button
              size="sm"
              variant="ghost"
              color="error"
              onClick={() => onReject(item.id)}
              data-mol-id="moderation-queue-row-reject"
              aria-label={t('moderationQueue.aria.reject', {}, { defaultValue: 'Reject' })}
              >{t('moderationQueue.action.reject', {}, { defaultValue: 'Reject' })}</Button
            >
            {#if onEscalate}
              <Button
                size="sm"
                variant="ghost"
                color="warning"
                onClick={() => onEscalate?.(item.id)}
                data-mol-id="moderation-queue-row-escalate"
                aria-label={t('moderationQueue.aria.escalate', {}, { defaultValue: 'Escalate' })}
                >{t('moderationQueue.action.escalate', {}, { defaultValue: 'Escalate' })}</Button
              >
            {/if}
            {#if onMute}
              <Button
                size="sm"
                variant="ghost"
                color="secondary"
                onClick={() => onMute?.(item.id)}
                data-mol-id="moderation-queue-row-mute"
                aria-label={t('moderationQueue.aria.mute', {}, { defaultValue: 'Mute' })}
                >{t('moderationQueue.action.mute', {}, { defaultValue: 'Mute' })}</Button
              >
            {/if}
          </div>
        </li>
      {/each}
    </ul>
  </div>
{/if}
