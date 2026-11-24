<!--
  AuthShell: the Svelte counterpart of `@molecule/app-auth-shell-react`'s
  `AuthShell` — the centered glass card preset (container, decoration, card,
  heading, body, footer, back link), publishing the shared auth-form state to
  descendants through Svelte context.
-->
<script lang="ts">
  import { setContext } from 'svelte'

  import { PresentWhileContent } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import AuthShellBackLink from './AuthShellBackLink.svelte'
  import AuthShellCard from './AuthShellCard.svelte'
  import AuthShellContainer from './AuthShellContainer.svelte'
  import AuthShellHeading from './AuthShellHeading.svelte'
  import { AUTH_FORM_STATE_KEY } from './keys.js'
  import type { AuthShellProps } from './types.js'
  import { useAuthFormState } from './useAuthFormState.js'

  let {
    heading,
    subheading,
    children,
    footer,
    brand,
    decoration,
    backTo = '/',
    showBackLink = true,
    formStateStorage,
    formStateKey,
  }: AuthShellProps = $props()

  setContext(
    AUTH_FORM_STATE_KEY,
    useAuthFormState(() => ({ storage: formStateStorage, storageKey: formStateKey })),
  )

  const cm = $derived(getClassMap())
</script>

<AuthShellContainer>
  <!-- React gates the decoration and footer wrappers on `slot(...)`: each wrapper is in the page
       only while its snippet renders something. -->
  {#if decoration}
    <PresentWhileContent tag="div" class={cm.cn(cm.authShellDecoration)}
      >{@render decoration?.()}</PresentWhileContent
    >
  {/if}
  <div>
    <AuthShellCard>
      {#if brand}{@render brand?.()}{/if}
      <AuthShellHeading {heading} {subheading} />
      {@render children?.()}
      {#if footer}
        <PresentWhileContent
          tag="footer"
          class={cm.cn(cm.textCenter, cm.textSize('sm'), cm.authShellFooter)}
          >{@render footer?.()}</PresentWhileContent
        >
      {/if}
    </AuthShellCard>
    {#if showBackLink}
      <AuthShellBackLink to={backTo} />
    {/if}
  </div>
</AuthShellContainer>
