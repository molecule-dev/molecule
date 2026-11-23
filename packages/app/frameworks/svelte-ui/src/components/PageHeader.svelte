<!--
  PageHeader: a page title area with breadcrumb trail, description and
  actions.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from '../style.js'
  import type { PageHeaderProps } from '../types.js'

  let {
    ref = $bindable(null),
    title,
    description,
    actions,
    breadcrumbs,
    className,
    style,
    testId,
    automationId,
  }: PageHeaderProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const breadcrumbLabel = $derived(
    t('ui.pageHeader.breadcrumbs', undefined, { defaultValue: 'Breadcrumb' }),
  )
</script>

<div
  bind:this={ref}
  class={cm.cn(cm.pageHeader, className)}
  use:reactStyle={style}
  data-testid={testId}
  data-mol-id={automationId}
>
  {#if breadcrumbs && breadcrumbs.length > 0}
    <nav class={cm.pageHeaderBreadcrumbs} aria-label={breadcrumbLabel}>
      {#each breadcrumbs as crumb, index (index)}
        {#if index > 0}
          <span class={cm.pageHeaderBreadcrumbSeparator} aria-hidden="true">/</span>
        {/if}
        {#if crumb.href}
          <a href={crumb.href} class={cm.pageHeaderBreadcrumbItem}>{crumb.label}</a>
        {:else}
          <span class={cm.pageHeaderBreadcrumbItem}>{crumb.label}</span>
        {/if}
      {/each}
    </nav>
  {/if}
  <div class={cm.cn(cm.flex({ justify: 'between', align: 'center' }))}>
    <div>
      <h1 class={cm.pageHeaderTitle}>{title}</h1>
      {#if description}<p class={cm.pageHeaderDescription}>{description}</p>{/if}
    </div>
    {#if actions}<div class={cm.pageHeaderActions}>{@render actions?.()}</div>{/if}
  </div>
</div>
