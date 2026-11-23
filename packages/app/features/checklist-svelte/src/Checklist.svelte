<!--
  Checklist: the Svelte counterpart of `@molecule/app-checklist-react`'s
  `Checklist` — checkable items with optional descriptions, an optional title,
  and an overall progress bar derived from the items. Same props (React names),
  same DOM for the same input, and the same `onToggle(id, next)` calls. Fully
  controlled: it never mutates `completed`.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Checkbox } from '@molecule/app-ui-svelte'

  import type { ChecklistItem, ChecklistProps } from './types.js'

  let { items, onToggle, showProgress = true, title, className }: ChecklistProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const total = $derived(items.length)
  const done = $derived(items.filter((item) => item.completed).length)
  const pct = $derived(total === 0 ? 0 : Math.round((done / total) * 100))
  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so the text re-runs on a locale switch the way React's render-time
  // `t` call re-runs on a re-render.
  const progressText = $derived(
    t('checklist.progress', { done, total }, { defaultValue: '{{done}} of {{total}} complete' }),
  )

  /**
   * React's `aria-label`: the label text when it is a plain string, else the item id.
   *
   * @param item - The checklist item.
   * @returns The accessible name.
   */
  const ariaLabel = (item: ChecklistItem): string =>
    typeof item.label === 'string' ? item.label : item.id

  /**
   * React's controlled-checkbox `onChange`: report the input's new state.
   *
   * @param item - The toggled item.
   * @param event - The click event React's checkbox change fires with.
   */
  const toggle = (item: ChecklistItem, event: Event): void => {
    onToggle?.(item.id, (event.target as HTMLInputElement).checked)
  }
</script>

<div class={cm.cn(cm.stack(3), className)}>
  {#if title}
    <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
      {#if typeof title === 'string'}{title}{:else}{@render title?.()}{/if}
    </h3>
  {/if}
  {#if showProgress}
    <div class={cm.stack(1)}>
      <div class={cm.flex({ justify: 'between', align: 'center' })}>
        <span class={cm.textSize('xs')}>
          {progressText}
        </span>
        <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{pct}%</span>
      </div>
      <div class={cm.cn(cm.progress(), cm.progressHeight('sm'))}>
        <div
          class={cm.cn(cm.progressBar(), cm.progressColor('primary'))}
          style="width: {pct}%"
        ></div>
      </div>
    </div>
  {/if}
  <ul class={cm.stack(2)}>
    {#each items as item (item.id)}
      <li class={cm.flex({ align: 'start', gap: 'sm' })}>
        <span class={cm.shrink0}>
          <Checkbox
            checked={item.completed}
            disabled={item.disabled}
            aria-label={ariaLabel(item)}
            onChange={(event) => toggle(item, event)}
          />
        </span>
        <div class={cm.cn(cm.flex1, cm.stack(0))}>
          <span
            class={cm.cn(
              cm.textSize('sm'),
              item.completed ? cm.fontWeight('medium') : cm.fontWeight('semibold'),
            )}
            style={item.completed ? 'text-decoration: line-through; opacity: 0.6' : undefined}
          >
            {#if typeof item.label === 'string'}{item.label}{:else}{@render item.label?.()}{/if}
          </span>
          {#if item.description}
            <span class={cm.textSize('xs')}>
              {#if typeof item.description === 'string'}{item.description}{:else}{@render item.description?.()}{/if}
            </span>
          {/if}
        </div>
      </li>
    {/each}
  </ul>
</div>
