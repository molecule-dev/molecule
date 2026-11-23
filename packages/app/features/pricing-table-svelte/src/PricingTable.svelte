<!--
  PricingTable: the Svelte counterpart of `@molecule/app-pricing-table-react`'s
  `PricingTable` — a features × plans comparison matrix. A header row holds
  plan cards (name, description, price, interval, CTA); body rows show
  per-feature availability (`true` → ✓, `false` → —, strings/snippets pass
  through). The wrapper scrolls horizontally when columns overflow.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Card } from '@molecule/app-ui-svelte'

  import type { PricingFeature, PricingPlan, PricingTableProps } from './types.js'

  let { plans, features, className }: PricingTableProps = $props()

  const cm = $derived(getClassMap())

  const wrapperStyle = 'overflow-x: auto'
  const tableStyle = 'width: 100%; border-collapse: separate; border-spacing: 0px'
  const labelHeadStyle = 'min-width: 160px; text-align: left'
  const planHeadStyle = 'vertical-align: top; padding: 12px'
  const groupHeadStyle = 'text-align: left; padding: 12px 8px'
  const valueCellStyle = 'padding: 8px; text-align: center'
  const labelCellStyle = 'padding: 8px; text-align: left'
  const recommendedStyle = { outline: '2px solid currentColor', outlineOffset: '-2px' }

  /**
   * Renders a feature cell value: `true` → ✓, `false` → —, anything else
   * pass-through.
   * @param v - The per-plan feature value.
   * @returns The content to render.
   */
  function renderValue(
    v: PricingFeature['values'][string] | undefined,
  ): PricingFeature['values'][string] | undefined {
    if (v === true) return '✓'
    if (v === false) return '—'
    return v
  }
</script>

{#snippet content(value: PricingPlan['name'] | PricingFeature['values'][string] | undefined)}
  {#if typeof value === 'function'}{@render value?.()}{:else}{value}{/if}
{/snippet}

<div class={cm.cn(cm.stack(0), className)} style={wrapperStyle}>
  <table style={tableStyle}>
    <thead>
      <tr>
        <th style={labelHeadStyle}></th>
        {#each plans as plan (plan.id)}
          <th style={planHeadStyle}>
            <Card style={plan.recommended ? recommendedStyle : undefined}>
              <div class={cm.stack(2)}>
                <h3 class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
                  {@render content(plan.name)}
                </h3>
                {#if plan.description}
                  <p class={cm.textSize('sm')}>{@render content(plan.description)}</p>
                {/if}
                <div class={cm.flex({ align: 'baseline', gap: 'xs' })}>
                  <span class={cm.cn(cm.textSize('2xl'), cm.fontWeight('bold'))}>
                    {@render content(plan.price)}
                  </span>
                  {#if plan.interval}
                    <span class={cm.textSize('xs')}>{@render content(plan.interval)}</span>
                  {/if}
                </div>
                {#if plan.cta}
                  {#if plan.cta.href}
                    <a href={plan.cta.href}>
                      <Button variant="solid" color={plan.recommended ? 'primary' : 'secondary'}>
                        {@render content(plan.cta.label)}
                      </Button>
                    </a>
                  {:else}
                    <Button
                      variant="solid"
                      color={plan.recommended ? 'primary' : 'secondary'}
                      onClick={plan.cta.onClick}
                    >
                      {@render content(plan.cta.label)}
                    </Button>
                  {/if}
                {/if}
              </div>
            </Card>
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each features as feature, index (`r-${index}`)}
        {#if feature.groupHeading}
          <tr>
            <th colspan={plans.length + 1} style={groupHeadStyle}>
              <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>
                {@render content(feature.groupHeading)}
              </span>
            </th>
          </tr>
        {/if}
        <tr>
          <td style={labelCellStyle}>
            <span class={cm.textSize('sm')}>{@render content(feature.label)}</span>
          </td>
          {#each plans as plan (plan.id)}
            <td style={valueCellStyle}>
              <span class={cm.textSize('sm')}>
                {@render content(renderValue(feature.values[plan.id]))}
              </span>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
