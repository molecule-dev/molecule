<!--
  ShareLinkCard: the Svelte counterpart of
  `@molecule/app-share-link-card-react`'s `ShareLinkCard` — a read-only URL
  field with a copy button, an optional title/description header, a QR slot
  (rendered only when BOTH `showQR` and `qr` are set), and an optional
  password-protect toggle. Same props, same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
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

  // React's `passwordProtect.label ?? t('shareLink.passwordProtect', …)`.
  const passwordLabel = $derived(
    passwordProtect?.label ??
      t('shareLink.passwordProtect', {}, { defaultValue: 'Password protect' }),
  )
</script>

<Card data-mol-id={dataMolId} {className}>
  <div class={cm.stack(3)}>
    {#if title || description}
      <header class={cm.stack(1)}>
        {#if title}
          <h3 class={cm.cn(cm.textSize('base'), cm.fontWeight('semibold'))}>
            {@render title()}
          </h3>
        {/if}
        {#if description}
          <p class={cm.textSize('sm')}>{@render description()}</p>
        {/if}
      </header>
    {/if}
    <CopyLinkField value={url} />
    {#if showQR && qr}
      <div class={cm.cn(cm.flex({ align: 'center', justify: 'center' }), cm.sp('py', 2))}>
        {@render qr()}
      </div>
    {/if}
    {#if passwordProtect}
      <div class={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
        <span class={cm.textSize('sm')}>
          {#if typeof passwordLabel === 'string'}{passwordLabel}{:else}{@render passwordLabel()}{/if}
        </span>
        <Switch
          checked={passwordProtect.enabled}
          onChange={(event) =>
            passwordProtect?.onChange((event.target as HTMLInputElement).checked)}
        />
      </div>
    {/if}
  </div>
</Card>
