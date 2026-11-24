<!--
  ShareLinkCard: the Svelte counterpart of
  `@molecule/app-share-link-card-react`'s `ShareLinkCard` — a read-only URL
  field with a copy button, an optional title/description header, a QR slot
  (rendered only when BOTH `showQR` and `qr` are set), and an optional
  password-protect toggle. Same props, same DOM for the same input.
-->
<script lang="ts">
  import { PresentWhileContent, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Card, Switch } from '@molecule/app-ui-svelte'

  import CopyLinkField from './CopyLinkField.svelte'
  import type { ShareLinkCardProps } from './types.js'

  let {
    title,
    description,
    url,
    qr,
    showQR = false,
    passwordProtect,
    className,
    dataMolId,
  }: ShareLinkCardProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // The password switch is named from its visible label; `$props.id()` is this
  // instance's stable id (React's `useId()`).
  const labelId = $props.id()

  // React's `passwordProtect.label ?? t('shareLink.passwordProtect', …)`.
  const passwordLabel = $derived(
    passwordProtect?.label ??
      t('shareLink.passwordProtect', {}, { defaultValue: 'Password protect' }),
  )
  // An EMPTY string label draws nothing, and a switch named by an empty
  // element has no accessible name: that case is named from i18n instead.
  const hasPasswordLabel = $derived(
    !(typeof passwordLabel === 'string' && passwordLabel.trim() === ''),
  )
</script>

<Card data-mol-id={dataMolId} {className}>
  <div class={cm.stack(3)}>
    {#if title || description}
      <PresentWhileContent tag="header" class={cm.stack(1)}
        >{#if title}<PresentWhileContent
            tag="h3"
            class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}
            >{@render title?.()}</PresentWhileContent
          >{/if}{#if description}<PresentWhileContent tag="p" class={cm.textSize('sm')}
            >{@render description?.()}</PresentWhileContent
          >{/if}</PresentWhileContent
      >
    {/if}
    <CopyLinkField value={url} />
    {#if showQR && qr}
      <div class={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 2))}>
        {@render qr?.()}
      </div>
    {/if}
    {#if passwordProtect}
      <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span class={cm.textSize('sm')} id={hasPasswordLabel ? labelId : undefined}>
          {#if typeof passwordLabel === 'string'}{passwordLabel}{:else}{@render passwordLabel?.()}{/if}
        </span>
        <Switch
          checked={passwordProtect.enabled}
          onChange={(event) =>
            passwordProtect?.onChange((event.target as HTMLInputElement).checked)}
          aria-labelledby={hasPasswordLabel ? labelId : undefined}
          aria-label={hasPasswordLabel
            ? undefined
            : t('shareLink.passwordProtect', {}, { defaultValue: 'Password protect' })}
        />
      </div>
    {/if}
  </div>
</Card>
