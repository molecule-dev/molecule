<!--
  StatusSummary: the Svelte counterpart of `@molecule/app-status-summary-react`'s
  `StatusSummary` — grouped component list with colored badges and an overall
  banner derived from the worst child status. Same props, same DOM for the
  same input; `header` and `footer` are snippet slots, and a group or component
  name may be plain text or a snippet. The banner and badge colors come from
  the ClassMap's semantic tones, and every label comes from the same i18n keys
  with the same English fallbacks.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { useTranslation } from '@molecule/app-svelte'
  import type { ColorVariant } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  import type { ComponentStatus, StatusSummaryProps } from './types.js'

  /**
   * The semantic tone colouring each status: the theme's success green for
   * operational, its warning amber for degraded and partial outage, its error
   * red for a major outage and its info blue for maintenance.
   */
  const STATUS_TONE: Record<ComponentStatus, ColorVariant> = {
    operational: 'success',
    degraded: 'warning',
    'partial-outage': 'warning',
    'major-outage': 'error',
    maintenance: 'info',
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
   * The label for one status, through its literal i18n key with the English
   * fallback (the same text the `common` locale bond's en.ts ships).
   *
   * @param status - The status to label.
   * @returns The translated label.
   */
  function statusLabel(status: ComponentStatus): string {
    switch (status) {
      case 'operational':
        return t('status.operational', {}, { defaultValue: 'Operational' })
      case 'degraded':
        return t('status.degraded', {}, { defaultValue: 'Degraded performance' })
      case 'partial-outage':
        return t('status.partial-outage', {}, { defaultValue: 'Partial outage' })
      case 'major-outage':
        return t('status.major-outage', {}, { defaultValue: 'Major outage' })
      case 'maintenance':
        return t('status.maintenance', {}, { defaultValue: 'Under maintenance' })
    }
  }

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

  /** The banner's rounded corners, in React's declaration order. */
  const bannerStyle = 'border-radius: 8px'

  /** One badge's rounded corners, in React's declaration order. */
  const badgeStyle = 'border-radius: 4px'
</script>

{#snippet field(value: Snippet | string | undefined)}
  {#if isSnippet(value)}{@render value?.()}{:else}{value ?? ''}{/if}
{/snippet}

<div class={cm.cn(cm.stack(4), className)}>
  <div
    class={cm.cn(
      cm.flex({ align: 'center', justify: 'between', gap: 'md' }),
      cm.sp('p', 3),
      cm.bgTone(STATUS_TONE[overall]),
      cm.textOnTone,
    )}
    style={bannerStyle}
  >
    <span class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>{statusLabel(overall)}</span>
    {#if header}{@render header?.()}{/if}
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
              class={cm.cn(
                cm.sp('px', 2),
                cm.textSize('xs'),
                cm.fontWeight('semibold'),
                cm.bgTone(STATUS_TONE[component.status]),
                cm.textOnTone,
              )}
              style={badgeStyle}>{statusLabel(component.status)}</span
            >
          </li>
        {/each}
      </ul>
    </section>
  {/each}
  {#if footer}{@render footer?.()}{/if}
</div>
