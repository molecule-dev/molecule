<!--
  CopyLinkField: the Svelte counterpart of `@molecule/app-copy-link-field-react`'s
  `CopyLinkField` — read-only input + copy-to-clipboard button with "Copied!"
  feedback. Same props, same DOM for the same input: the input's value is
  applied through both the property and the attribute the way React's is (see
  `value.ts`), and every visible string goes through `t()` so a locale switch
  re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { CopyLinkFieldProps } from './types.js'
  import { reactInputValue } from './value.js'

  let {
    value,
    label,
    onCopy,
    feedbackMs = 1500,
    size = 'sm',
    className,
  }: CopyLinkFieldProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let copied = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  // Detaches the feedback timer with the component (React leaves it running;
  // the write it would make on a dead component is observable nowhere).
  $effect(() => () => clearTimeout(timer))

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const ariaLabel = $derived(label ?? t('copyLink.field', {}, { defaultValue: 'Link' }))
  const buttonLabel = $derived(
    copied
      ? t('copyLink.copied', {}, { defaultValue: 'Copied!' })
      : t('copyLink.copy', {}, { defaultValue: 'Copy' }),
  )

  /** Copies the value, then shows the "Copied!" feedback for `feedbackMs`. */
  function copy(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(value).then(() => {
        copied = true
        onCopy?.()
        timer = setTimeout(() => {
          copied = false
        }, feedbackMs)
      })
    }
  }
</script>

<div class={cm.cn(cm.stack(1), className)}>
  {#if label}
    <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{label}</span>
  {/if}
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    <input
      readonly
      type="text"
      use:reactInputValue={{ value }}
      onfocusin={(e) => (e.target as HTMLInputElement).select()}
      class={cm.cn(cm.input(), cm.flex1)}
      aria-label={ariaLabel}
    />
    <Button variant="solid" {size} onClick={copy}>{buttonLabel}</Button>
  </div>
</div>
