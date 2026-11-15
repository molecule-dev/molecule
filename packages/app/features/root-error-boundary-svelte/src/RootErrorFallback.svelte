<!--
  RootErrorFallback: the recovery alert the boundary shows once a render
  error is caught — the counterpart of `@molecule/app-root-error-boundary-react`'s
  internal `RootErrorFallback`. It reads `t` from `useTranslation()`, so it
  re-renders in the new language after a locale switch.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  const { t } = useTranslation()

  const cm = $derived(getClassMap())
  const rootClass = $derived(
    cm.cn(cm.flex({ direction: 'col', align: 'center', justify: 'center' }), cm.sp('p', 8)),
  )
  const textClass = $derived(cm.cn(cm.textSize('sm'), cm.fontWeight('medium')))
  const message = $derived(
    t('error.unknown', {}, { defaultValue: 'An unexpected error occurred.' }),
  )
</script>

<div class={rootClass} role="alert">
  <p class={textClass}>{message}</p>
</div>
