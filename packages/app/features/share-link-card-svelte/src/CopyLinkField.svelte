<!--
  CopyLinkField: the internal, trimmed copy field `<ShareLinkCard>` renders —
  the Svelte counterpart of the React package's `CopyLinkField` (which is not
  exported from the barrel). Read-only input + copy-to-clipboard button with
  "Copied!" feedback; the input's value is applied through both the property
  and the attribute the way React's is (see `value.ts`).
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { CopyLinkFieldProps } from './copy-link-field-types.js'
  import { reactInputValue } from './value.js'

  let { value, className }: CopyLinkFieldProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let copied = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  $effect(() => () => clearTimeout(timer))

  const buttonLabel = $derived(
    copied
      ? t('copyLink.copied', {}, { defaultValue: 'Copied!' })
      : t('copyLink.copy', {}, { defaultValue: 'Copy' }),
  )

  /** Copies the value, then shows the "Copied!" feedback for 1500ms. */
  function copy(): void {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(value).then(() => {
        copied = true
        timer = setTimeout(() => {
          copied = false
        }, 1500)
      })
    }
  }
</script>

<div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
  <input
    readonly
    type="text"
    use:reactInputValue={{ value }}
    onfocusin={(e) => (e.target as HTMLInputElement).select()}
    class={cm.cn(cm.input(), cm.flex1)}
  />
  <Button variant="solid" size="sm" onClick={copy}>{buttonLabel}</Button>
</div>
