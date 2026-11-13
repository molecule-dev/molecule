<!--
  Spinner: a role="status" loading indicator. Data-* and aria-* props are
  forwarded to the div; an arbitrary color becomes border colors inline.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from '../style.js'
  import type { SpinnerProps } from '../types.js'

  let { size = 'md', color, label, className, style, testId, ...rest }: SpinnerProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const classes = $derived(cm.cn(cm.spinner({ size }), className))
  const namedColors = ['primary', 'secondary', 'success', 'warning', 'error', 'info']
  const colorStyle = $derived(
    color && typeof color === 'string' && !namedColors.includes(color)
      ? { borderColor: color, borderTopColor: 'transparent' }
      : undefined,
  )
  const passthrough = $derived.by(() => {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(rest)) {
      if (k.startsWith('data-') || k.startsWith('aria-')) out[k] = v
    }
    return out
  })
  const mergedStyle = $derived({ ...style, ...colorStyle })
</script>

<div
  role="status"
  aria-label={label || t('ui.spinner.loading', undefined, { defaultValue: 'Loading' })}
  class={classes}
  use:reactStyle={mergedStyle}
  data-testid={testId}
  {...passthrough}
>
  {#if label}<span class={cm.srOnly}>{label}</span>{/if}
</div>
