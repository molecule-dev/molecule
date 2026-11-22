<!--
  The custom-aliases + custom-form counterexample: the same `useProfileForm` setup
  as the React package's ContactForm — a handle-keyed account with nullable aliases,
  plus a plain newsletter form that must stay local. The account output reads the
  session through the binding's `useAuth`, as a component in the app would.
  ContactHost mounts it under the auth provider.
-->
<script lang="ts">
  import { flushSync } from 'svelte'

  import { useAuth, useProfileForm } from '@molecule/app-svelte'

  import type { HandleUser } from './account-types.js'

  type ContactValues = { displayName: string; avatarUrl: string }

  const form = useProfileForm<HandleUser, ContactValues>({
    defaultValues: { displayName: '', avatarUrl: '' },
    getIdentity: (user) => user.handle,
    toValues: (user) => ({ displayName: user.displayName ?? '', avatarUrl: user.avatarUrl ?? '' }),
    toPatch: (changes) => ({
      ...('displayName' in changes ? { displayName: changes.displayName || null } : {}),
      ...('avatarUrl' in changes ? { avatarUrl: changes.avatarUrl || null } : {}),
    }),
  })
  const { formState, formProps } = form
  const displayNameField = form.register('displayName')
  const avatarUrlField = form.register('avatarUrl')
  const { user } = useAuth<HandleUser>()

  let digest = $state(false)
  let saved = $state(false)

  const saveNewsletter = (event: { preventDefault: () => void }): void => {
    event.preventDefault()
    saved = true
    flushSync()
  }
</script>

<form aria-label="Contact" onsubmit={formProps.onSubmit}>
  <input
    aria-label="Display name"
    value={$formState.values.displayName}
    oninput={(e) =>
      displayNameField.onChange({ target: { value: (e.target as HTMLInputElement).value } })}
  />
  <input
    aria-label="Avatar URL"
    value={$formState.values.avatarUrl}
    oninput={(e) =>
      avatarUrlField.onChange({ target: { value: (e.target as HTMLInputElement).value } })}
  />
  <button type="submit">Save contact</button>
  <output aria-label="Contact client">{$user?.handle}</output>
</form>

<form aria-label="Newsletter" onsubmit={saveNewsletter}>
  <input
    aria-label="Weekly digest"
    type="checkbox"
    checked={digest}
    onchange={() => (digest = !digest)}
  />
  <button type="submit">Save newsletter</button>
  {#if saved}<output aria-label="Newsletter state">{String(digest)}</output>{/if}
</form>
