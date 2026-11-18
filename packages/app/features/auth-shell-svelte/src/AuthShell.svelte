<!--
  AuthShell: the Svelte counterpart of `@molecule/app-auth-shell-react`'s
  `AuthShell` — the centered glass card preset (container, decoration, card,
  heading, body, footer, back link), publishing the shared auth-form state to
  descendants through Svelte context.
-->
<script lang="ts">
  import { setContext } from 'svelte'

  import AuthShellBackLink from './AuthShellBackLink.svelte'
  import AuthShellCard from './AuthShellCard.svelte'
  import AuthShellContainer from './AuthShellContainer.svelte'
  import AuthShellDecoration from './AuthShellDecoration.svelte'
  import AuthShellFooter from './AuthShellFooter.svelte'
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
</script>

<AuthShellContainer>
  {#if decoration}
    <AuthShellDecoration>{@render decoration()}</AuthShellDecoration>
  {/if}
  <div>
    <AuthShellCard>
      {#if brand}{@render brand()}{/if}
      <AuthShellHeading {heading} {subheading} />
      {@render children()}
      {#if footer}
        <AuthShellFooter>{@render footer()}</AuthShellFooter>
      {/if}
    </AuthShellCard>
    {#if showBackLink}
      <AuthShellBackLink to={backTo} />
    {/if}
  </div>
</AuthShellContainer>
