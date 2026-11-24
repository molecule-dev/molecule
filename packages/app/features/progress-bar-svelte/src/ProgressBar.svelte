<!--
  ProgressBar: the Svelte counterpart of `@molecule/app-progress-bar-react`'s
  `ProgressBar` — same props, same ClassMap tokens, same DOM. Node props
  (`label`, `valueLabel`) are snippets, or plain strings.

  The track always carries an accessible name: `labelledBy` when given, else
  the rendered `label`, else the `t('progressBar.label')` default — read
  through `useTranslation()` so it follows a locale switch.
-->
<script lang="ts">
  import { ContentOrElse, PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import type { ProgressBarProps } from './types.js'

  let {
    value,
    max = 100,
    label,
    valueLabel,
    labelledBy,
    describedBy,
    size = 'md',
    color = 'primary',
    className,
  }: ProgressBarProps = $props()

  // `$props.id()` is this instance's stable id (React's `useId()`).
  const nameId = $props.id()
  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  const percent = $derived(max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100)))
  // React's `slot(label)` / `slot(valueLabel)`: a node that renders nothing is absent, so the
  // label/valueLabel spans (and the row around them) leave the page while empty. `ContentOrElse`
  // reads what the snippet renders; `PresentWhileContent present={…}` takes the element out.
  let labelRenders = $state<boolean>()
  let valueLabelRenders = $state<boolean>()
  // Read against the props too: a prop removed by a later render is absent even if the last
  // decision `ContentOrElse` reported was for the element that just unmounted.
  const labelPresent = $derived(Boolean(label) && labelRenders !== false)
  const valueLabelPresent = $derived(Boolean(valueLabel) && valueLabelRenders !== false)
  const rowRenders = $derived(labelPresent || valueLabelPresent)
  // The rendered label is the track's name unless an explicit labelledBy wins.
  const namedByLabel = $derived(labelledBy === undefined && labelPresent)
  const fallbackName = $derived(t('progressBar.label', undefined, { defaultValue: 'Progress' }))
</script>

<div class={cm.cn(cm.stack(2), className)}>
  {#if label || valueLabel}
    <PresentWhileContent
      present={rowRenders}
      class={cm.flex({ justify: 'between', align: 'center' })}
    >
      {#if label}
        <PresentWhileContent
          tag="span"
          present={labelPresent}
          id={namedByLabel ? nameId : undefined}
          class={cm.cn(cm.textSize('sm'), cm.fontWeight('medium'))}
        >
          <ContentOrElse bind:present={labelRenders}
            >{#if typeof label === 'function'}{@render label?.()}{:else}{label}{/if}</ContentOrElse
          >
        </PresentWhileContent>
      {/if}
      {#if valueLabel}
        <PresentWhileContent tag="span" present={valueLabelRenders} class={cm.textSize('sm')}>
          <ContentOrElse bind:present={valueLabelRenders}
            >{#if typeof valueLabel === 'function'}{@render valueLabel?.()}{:else}{valueLabel}{/if}</ContentOrElse
          >
        </PresentWhileContent>
      {/if}
    </PresentWhileContent>
  {/if}
  <div
    class={cm.cn(cm.progress(), cm.progressHeight(size))}
    role="progressbar"
    aria-valuenow={value}
    aria-valuemin={0}
    aria-valuemax={max}
    aria-labelledby={labelledBy ?? (namedByLabel ? nameId : undefined)}
    aria-label={labelledBy === undefined && !labelPresent ? fallbackName : undefined}
    aria-describedby={describedBy}
  >
    <div class={cm.cn(cm.progressBar(), cm.progressColor(color))} style="width: {percent}%"></div>
  </div>
</div>
