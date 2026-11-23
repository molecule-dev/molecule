<!--
  SecretRow: the Svelte counterpart of `@molecule/app-secret-row-react`'s
  `SecretRow` — masked credential value + reveal/copy + rotation status +
  version. Same props (React names), same DOM for the same input. The Rotate /
  Delete buttons render only when their handler is passed.

  The root and the key/description column are flex containers, so a line break
  between their children is trimmed and draws nothing; node-valued fields
  (version, description, lastRotatedAt) render through the `field` snippet,
  which mirrors React's `{value && <span>…</span>}` / `v{version}` shapes.
-->
<script lang="ts">
  import type { Snippet } from 'svelte'

  import { copyTextWithFallback } from '@molecule/app-clipboard'
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { SecretRowProps } from './types.js'

  let { secret, onRotate, onDelete, maskChar = '•', className }: SecretRowProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let revealed = $state(false)
  let copied = $state(false)
  let timer: ReturnType<typeof setTimeout> | undefined

  // Detaches the feedback timer with the component (React leaves it running;
  // the write it would make on a dead component is observable nowhere).
  $effect(() => () => clearTimeout(timer))

  const masked = $derived(maskChar.repeat(Math.max(8, Math.min(secret.value.length, 24))))
  const expired = $derived(secret.daysUntilRotation !== undefined && secret.daysUntilRotation < 0)
  const showCountdown = $derived(
    secret.daysUntilRotation !== undefined && secret.daysUntilRotation >= 0,
  )
  const showLastRotated = $derived(
    secret.lastRotatedAt !== undefined && secret.lastRotatedAt !== null,
  )
  const rotationDays = $derived(secret.daysUntilRotation ?? 0)

  const rootClass = $derived(
    cm.cn(cm.flex({ align: 'center', gap: 'sm' }), cm.sp('py', 2), className),
  )
  const stackClass = $derived(cm.cn(cm.flex1, cm.stack(0)))
  const keyClass = $derived(cm.cn(cm.fontWeight('semibold')))
  const descriptionClass = $derived(cm.textSize('xs'))
  const codeClass = $derived(cm.cn(cm.sp('px', 2), cm.sp('py', 1), cm.textSize('xs')))
  const chipClass = $derived(cm.cn(cm.textSize('xs'), cm.fontWeight('semibold')))
  const expiredClass = $derived(
    cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'), cm.textTone('error')),
  )
  const mutedClass = $derived(cm.cn(cm.textSize('xs'), cm.textMuted))

  /** Copies the value, then shows the "Copied!" feedback for 1.5 s. */
  function copy(): void {
    void copyTextWithFallback(secret.value).then((didCopy) => {
      if (!didCopy) return
      copied = true
      timer = setTimeout(() => {
        copied = false
      }, 1500)
    })
  }
</script>

{#snippet field(value: Snippet | string | number)}
  {#if typeof value === 'function'}{@render value?.()}{:else}{value ?? ''}{/if}
{/snippet}

<div class={rootClass}>
  <div class={stackClass}>
    <span class={keyClass}>{secret.key}</span>
    {#if secret.description}<span class={descriptionClass}>{@render field(secret.description)}</span
      >{:else}{@render field(secret.description ?? '')}{/if}
  </div>
  <code class={codeClass}>{revealed ? secret.value : masked}</code>
  {#if secret.version}<span class={chipClass}>v{@render field(secret.version)}</span
    >{:else}{@render field(secret.version ?? '')}{/if}
  {#if expired}<span class={expiredClass}
      >{t('secretRow.expired', {}, { defaultValue: 'Expired' })}</span
    >{/if}
  {#if showCountdown}<span class={chipClass}
      >{t(
        'secretRow.rotateIn',
        { days: rotationDays },
        { defaultValue: 'Rotate in {{days}}d' },
      )}</span
    >{/if}
  {#if showLastRotated}<span class={mutedClass}
      >{t('secretRow.lastRotated', {}, { defaultValue: 'Last rotated' })}&#32;{@render field(
        secret.lastRotatedAt ?? '',
      )}</span
    >{/if}
  <Button variant="ghost" size="sm" onClick={() => (revealed = !revealed)}
    >{revealed
      ? t('secretRow.hide', {}, { defaultValue: 'Hide' })
      : t('secretRow.show', {}, { defaultValue: 'Show' })}</Button
  >
  <Button variant="ghost" size="sm" onClick={copy}
    >{copied
      ? t('secretRow.copied', {}, { defaultValue: 'Copied!' })
      : t('secretRow.copy', {}, { defaultValue: 'Copy' })}</Button
  >
  {#if onRotate}<Button variant="ghost" size="sm" onClick={() => onRotate?.(secret)}
      >{t('secretRow.rotate', {}, { defaultValue: 'Rotate' })}</Button
    >{/if}
  {#if onDelete}<Button variant="ghost" size="sm" color="error" onClick={() => onDelete?.(secret)}
      >{t('secretRow.delete', {}, { defaultValue: 'Delete' })}</Button
    >{/if}
</div>
