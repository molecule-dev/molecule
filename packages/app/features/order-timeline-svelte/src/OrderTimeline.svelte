<!--
  OrderTimeline: the Svelte counterpart of
  `@molecule/app-order-timeline-react`'s `OrderTimeline` — the order / shipment
  progress timeline. Same props (React names), same DOM for the same input:
  placed → shipped → delivered milestones with connector lines, colored status
  nodes and an optional ETA line. Node-valued labels, details and the eta may
  be plain strings or snippets.
-->
<script lang="ts">
  import { getClassMap, type UIClassMap } from '@molecule/app-ui'

  import { reactStyle } from './style.js'
  import type { OrderMilestone, OrderTimelineProps } from './types.js'

  let { milestones, eta, orientation = 'horizontal', className }: OrderTimelineProps = $props()

  const cm = $derived(getClassMap())
  const vertical = $derived(orientation === 'vertical')

  /**
   * The status node's class: current wins over completed (its semantic tone),
   * and every other milestone is de-emphasis chrome — the theme's border
   * colour rather than a status tone.
   *
   * @param cm - The class map.
   * @param milestone - The milestone.
   * @returns The node's class.
   */
  const dotClass = (cm: UIClassMap, milestone: OrderMilestone): string =>
    cm.cn(
      milestone.current
        ? cm.bgTone('info')
        : milestone.completed
          ? cm.bgTone('success')
          : cm.bgBorder,
    )

  /**
   * The status node's inline style, exactly React's declarations (Svelte adds
   * no `px`, so the units are spelled out; `''` clears a property React
   * omits): sizing only — the fill colour is a ClassMap tone class (see
   * {@link dotClass}).
   *
   * @param milestone - The milestone.
   * @returns The style declarations.
   */
  const dotStyle = (milestone: OrderMilestone): Record<string, string> => ({
    width: '14px',
    height: '14px',
    'border-radius': '50%',
    border: milestone.current ? '3px solid currentColor' : '',
  })

  /**
   * The connector line's class: a completed leg takes the success tone; an
   * un-reached one is de-emphasis chrome in the theme's border colour.
   *
   * @param cm - The class map.
   * @param milestone - The milestone the connector belongs to.
   * @returns The connector's class.
   */
  const connectorClass = (cm: UIClassMap, milestone: OrderMilestone): string =>
    cm.cn(milestone.completed ? cm.bgTone('success') : cm.bgBorder)

  /**
   * The connector line's inline style, exactly React's declarations:
   * horizontal lines stretch between nodes, vertical ones run below the node
   * — sizing and flow only, the fill colour is a ClassMap class (see
   * {@link connectorClass}).
   *
   * @param isVertical - Whether the layout is vertical.
   * @returns The style declarations.
   */
  const connectorStyle = (isVertical: boolean): Record<string, string> =>
    isVertical
      ? {
          height: '24px',
          width: '2px',
          display: 'inline-block',
          flex: '',
          'margin-left': '',
          'margin-right': '',
        }
      : {
          width: '100%',
          height: '2px',
          display: 'inline-block',
          flex: '1',
          'margin-left': '4px',
          'margin-right': '4px',
        }
</script>

<div class={cm.cn(cm.stack(3), className)}>
  <div class={vertical ? cm.stack(2) : cm.flex({ align: 'start', gap: 'sm' })}>
    {#each milestones as milestone, i (milestone.id)}
      <div
        class={vertical
          ? cm.flex({ align: 'start', gap: 'sm' })
          : cm.cn(cm.stack(1), cm.flex1, cm.textCenter)}
      >
        <div class={cm.flex({ align: 'center', justify: 'center' })}>
          <span
            aria-hidden="true"
            class={dotClass(cm, milestone)}
            use:reactStyle={dotStyle(milestone)}
          ></span>
          {#if i < milestones.length - 1}
            <span
              aria-hidden="true"
              class={connectorClass(cm, milestone)}
              use:reactStyle={connectorStyle(vertical)}
            ></span>
          {/if}
        </div>
        <div class={cm.cn(cm.stack(0))}>
          <span
            class={cm.cn(
              cm.textSize('sm'),
              milestone.current ? cm.fontWeight('bold') : cm.fontWeight('medium'),
            )}
          >
            {#if typeof milestone.label === 'string'}{milestone.label}{:else}{@render milestone.label?.()}{/if}
          </span>
          {#if milestone.detail}
            <span class={cm.textSize('xs')}>
              {#if typeof milestone.detail === 'string'}{milestone.detail}{:else}{@render milestone.detail?.()}{/if}
            </span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
  {#if eta}
    <div class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
      {#if typeof eta === 'string'}{eta}{:else}{@render eta?.()}{/if}
    </div>
  {/if}
</div>
