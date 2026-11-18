<!--
  AuthFormStateProvider: the Svelte counterpart of
  `@molecule/app-auth-shell-react`'s `AuthFormStateProvider` — publishes one
  shared auth-form state to descendants through Svelte context and renders its
  children with no DOM of its own.
-->
<script lang="ts">
  import { setContext } from 'svelte'

  import { AUTH_FORM_STATE_KEY } from './keys.js'
  import type { AuthFormStateProviderProps } from './types.js'
  import { useAuthFormState } from './useAuthFormState.js'

  let { children, storage, storageKey, initialFields }: AuthFormStateProviderProps = $props()

  setContext(
    AUTH_FORM_STATE_KEY,
    useAuthFormState(() => ({ storage, storageKey, initialFields })),
  )
</script>

{@render children?.()}
