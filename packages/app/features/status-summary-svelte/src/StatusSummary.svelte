<!--
  StatusSummary: the Svelte counterpart of `@molecule/app-status-summary-react`'s
  `StatusSummary` — grouped component list with colored badges and an overall
  banner derived from the worst child status. Same props, same DOM for the
  same input; `header` and `footer` are snippet slots, and a group or component
  name may be plain text or a snippet. The banner and badge colors are inline
  styles (React's fixed palette), and every label comes from the same i18n keys
  with the same English fallbacks.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ComponentStatus, StatusSummaryProps } from './types.js'

  /** English label rendered for each status when no locale bond supplies the key. */
  const STATUS_LABEL: Record<ComponentStatus, string> = {
    operational: 'Operational',
    degraded: 'Degraded performance',
    'partial-outage': 'Partial outage',
    'major-outage': 'Major outage',
    maintenance: 'Under maintenance',
  }

  /** The fixed semantic hue of each status (React's inline-style palette). */
  const STATUS_COLOR: Record<ComponentStatus, string> = {
    operational: '#22c55e',
    degraded: '#eab308',
    'partial-outage': '#f97316',
    'major-outage': '#ef4444',
    maintenance: '#60a5fa',
  }

  /** The statuses from most to least severe (React's `worst` order). */
  const SEVERITY_ORDER: ComponentStatus[] = [
    'major-outage',
    'partial-outage',
    'degraded',
    'maintenance',
    'operational',
  ]

  let { groups, overallStatus, header, footer, className }: StatusSummaryProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /**
   * Returns the most severe status from an array of ComponentStatus values.
   *
   * @param statuses - Every component status in the summary.
   * @returns The worst status found, or `'operational'` for an empty list.
   */
  function worst(statuses: ComponentStatus[]): ComponentStatus {
    for (const status of SEVERITY_ORDER) {
      if (statuses.includes(status)) return status
    }
    return 'operational'
  }

  /**
   * Whether a field is a snippet (a node) rather than plain text.
   *
   * @param value - The field value.
   * @returns True when it renders through the render tag.
   */
  function isSnippet(value: Snippet | string | undefined): value is Snippet {
    return typeof value === 'function'
  }

  /** The banner's status: React's `overallStatus ?? worst(allStatuses)`. */
  const overall = $derived(
    overallStatus ?? worst(groups.flatMap((group) => group.components.map((c) => c.status))),
  )

  /** The banner's inline style, in React's declaration order. */
  const bannerStyle = $derived(
    `background: ${STATUS_COLOR[overall]}; color: #fff; border-radius: 8px`,
  )

  /**
   * One badge's inline style, in React's declaration order.
   *
   * @param status - The component's status.
   * @returns The style attribute text.
   */
  function badgeStyle(status: ComponentStatus): string {
    return `border-radius: 4px; background: ${STATUS_COLOR[status]}; color: #fff`
  }
</script>

{#snippet field(value: Snippet | string | undefined)}
  {#if isSnippet(value)}{@render value()}{:else}{value ?? ''}{/if}
{/snippet}

<div class={cm.cn(cm.stack(4), className)}>
  <div
    class={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }), cm.sp('p', 3))}
    style={bannerStyle}
  >
    <span class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
      >{t(`status.${overall}`, {}, { defaultValue: STATUS_LABEL[overall] })}</span
    >
    {#if header}{@render header()}{/if}
  </div>
  {#each groups as group (group.id)}
    <section class={cm.stack(2)}>
      <h3 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
        {@render field(group.name)}
      </h3>
      <ul class={cm.stack(1)}>
        {#each group.components as component (component.id)}
          <li class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
            <div>
              <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
                >{@render field(component.name)}</span
              >{#if component.subtitle}<span class={cm.cn(cm.sp('ml', 2), cm.textSize('xs'))}
                  >{@render field(component.subtitle)}</span
                >{/if}
            </div>
            <span
              class={cm.cn(cm.sp('px', 2), cm.textSize('xs'), cm.fontWeight('semibold'))}
              style={badgeStyle(component.status)}
              >{t(
                `status.${component.status}`,
                {},
                {
                  defaultValue: STATUS_LABEL[component.status],
                },
              )}</span
            >
          </li>
        {/each}
      </ul>
    </section>
  {/each}
  {#if footer}{@render footer()}{/if}
</div>
