<!--
  WeatherCard: the Svelte counterpart of `@molecule/app-weather-card-react`'s
  `WeatherCard` — the current-conditions hero: gradient background, glass
  condition pill, optional alert badge, hi/lo chip, and a 24h temperature
  sparkline rendered from a trace. Same props (React names), same DOM for the
  same input; React's node props are snippets so consumers keep control of
  translation and formatting.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { buildSparkline } from './sparkline.js'
  import type { WeatherCardProps } from './types.js'

  let {
    locationName,
    region,
    temperature,
    condition,
    conditionIcon = 'partly_cloudy_day',
    alertLevel,
    alertLabel,
    updatedLabel,
    unit = '°F',
    eyebrow,
    trace,
    feelsLikeLabel,
    highLowLabel,
    className,
  }: WeatherCardProps = $props()

  const cm = $derived(getClassMap())
  const sparkline = $derived(buildSparkline(trace))
  const alertTone = $derived(
    alertLevel === 'watch'
      ? cm.weatherCardAlertWatch
      : alertLevel === 'warning'
        ? cm.weatherCardAlertWarning
        : cm.weatherCardAlertEmergency,
  )
</script>

<div
  class={cm.cn(
    cm.flex({ direction: 'col', justify: 'between' }),
    cm.sp('p', 10),
    cm.weatherCardHero,
    className,
  )}
>
  <div class={cm.cn(cm.weatherCardContent)}>
    <div class={cm.cn(cm.flex({ align: 'center', justify: 'between', gap: 'md' }))}>
      <div>
        {#if eyebrow}
          <p
            class={cm.cn(
              cm.fontWeight('bold'),
              cm.textSize('xs'),
              cm.sp('mb', 1),
              cm.weatherCardEyebrow,
            )}
          >
            {@render eyebrow()}
          </p>
        {/if}
        <h2 class={cm.cn(cm.textSize('2xl'), cm.fontWeight('semibold'), cm.weatherCardLocation)}>
          {locationName}
        </h2>
        {#if region}
          <p class={cm.cn(cm.textSize('xs'), cm.sp('mt', 1), cm.weatherCardRegion)}>{region}</p>
        {/if}
      </div>
      {#if alertLevel}
        <span
          class={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.fontWeight('bold'),
            cm.weatherCardAlertBadge,
            alertTone,
          )}
        >
          <span class={cm.cn(cm.iconGlyphFont, cm.textSize('sm'))} aria-hidden="true">warning</span>
          {#if alertLabel}{@render alertLabel()}{:else}{alertLevel}{/if}
        </span>
      {/if}
    </div>

    <div class={cm.cn(cm.flex({ align: 'baseline', gap: 'lg' }), cm.sp('mt', 8))}>
      <span
        class={cm.cn(cm.weatherCardTemperature)}
        style="font-size: 4.5rem; font-weight: 200; letter-spacing: -0.03em; line-height: 1"
      >
        {Math.round(temperature)}{unit}
      </span>
      <div
        class={cm.cn(
          cm.flex({ align: 'center', gap: 'sm' }),
          cm.sp('px', 3),
          cm.sp('py', 1),
          cm.roundedFull,
          cm.weatherCardConditionPill,
        )}
      >
        <span
          class={cm.cn(cm.iconGlyphFont, cm.textSize('2xl'))}
          style="font-variation-settings: 'FILL' 1"
          aria-hidden="true"
        >
          {conditionIcon}
        </span>
        {#if condition}
          <span class={cm.cn(cm.fontWeight('semibold'), cm.textSize('sm'))}>{condition}</span>
        {/if}
      </div>
    </div>

    <div class={cm.cn(cm.flex({ align: 'center', gap: 'md', wrap: 'wrap' }), cm.sp('mt', 4))}>
      {#if feelsLikeLabel}
        <span class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'), cm.weatherCardFeelsLike)}>
          {@render feelsLikeLabel()}
        </span>
      {/if}
      {#if highLowLabel}
        <span
          class={cm.cn(
            cm.flex({ align: 'center', gap: 'xs' }),
            cm.sp('px', 3),
            cm.sp('py', 1),
            cm.roundedFull,
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.weatherCardHighLowChip,
          )}
        >
          {@render highLowLabel()}
        </span>
      {/if}
      {#if updatedLabel}
        <span class={cm.cn(cm.textSize('xs'), cm.weatherCardUpdated)}>{@render updatedLabel()}</span
        >
      {/if}
    </div>
  </div>

  <div class={cm.cn(cm.sp('mt', 10), cm.h(24), cm.w('full'), cm.weatherCardContent)}>
    <svg
      class={cm.cn(cm.w('full'), cm.h('full'))}
      viewBox="0 0 400 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path d={sparkline.fill} fill="white" opacity="0.25"></path>
      <path
        d={sparkline.stroke}
        fill="none"
        stroke="white"
        stroke-width="2.5"
        stroke-linecap="round"
      ></path>
    </svg>
  </div>

  <div class={cm.cn(cm.weatherCardGlowLarge)} aria-hidden="true"></div>
  <div class={cm.cn(cm.weatherCardGlowSmall)} aria-hidden="true"></div>
</div>
