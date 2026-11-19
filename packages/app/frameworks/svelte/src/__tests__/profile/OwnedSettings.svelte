<!--
  React's `Settings` in the session-ownership case: the profile form bound to
  native inputs, reporting its saving state.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useProfileForm } from '../../hooks/useProfileForm.js'

  interface Profile {
    username: string
    email: string
    token: string
    bio: string | null
    image: string | null
    id: string
  }
  type Fields = { username: string; bio: string }

  let {
    onSaved,
    getIdentity,
  }: {
    onSaved: (user: Profile) => void
    getIdentity?: (user: Profile) => string
  } = $props()

  const form = untrack(() =>
    useProfileForm<Profile, Fields>({
      defaultValues: { username: '', bio: '' },
      getIdentity,
      toValues: (user) => ({ username: user.username, bio: user.bio ?? '' }),
      toPatch: (changes) => changes,
      onSaved,
    }),
  )
  const { formState, isSubmitting } = form
  const username = form.register('username')
  const bio = form.register('bio')
</script>

<form aria-label="Settings" onsubmit={form.formProps.onSubmit}>
  <input
    aria-label="Username"
    name={username.name}
    value={$formState.values.username}
    oninput={username.onChange}
    onblur={username.onBlur}
  />
  <textarea
    aria-label="Bio"
    name={bio.name}
    value={$formState.values.bio}
    oninput={bio.onChange}
    onblur={bio.onBlur}></textarea>
  <button type="submit" disabled={$isSubmitting}>Save</button>
  <output aria-label="Saving">{String($isSubmitting)}</output>
</form>
