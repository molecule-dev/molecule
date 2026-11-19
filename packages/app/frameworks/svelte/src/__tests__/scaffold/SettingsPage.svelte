<!--
  The scaffold's settings page: a form seeded from the signed-in user, reset to
  the server's values, and saved through the shared client so every page reading
  `useAuth().user` sees the new profile at once.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { UserProfile } from '@molecule/app-auth'

  import { useAuthClient } from '../../context.js'
  import { useAuth } from '../../hooks/useAuth.js'
  import { useForm } from '../../hooks/useForm.js'

  interface AppUser extends UserProfile {
    username?: string
    bio?: string
  }
  interface SettingsValues extends Record<string, unknown> {
    name: string
    bio: string
  }

  let { staleSubmit = false }: { staleSubmit?: boolean } = $props()
  const { user } = useAuth<AppUser>()
  const client = useAuthClient<AppUser>()
  let saved = $state('')
  const form = untrack(() =>
    useForm<SettingsValues>({
      defaultValues: { name: $user?.name ?? '', bio: $user?.bio ?? '' },
    }),
  )
  const { formState } = form
  // CONTROL: capture the values at init and submit those, which is what
  // reading a closed-over snapshot instead of the form's live values does.
  const captured = { name: $user?.name ?? '', bio: $user?.bio ?? '' }
  const name = form.register('name')
  const bio = form.register('bio')

  /**
   * Saves the form (or the captured stale snapshot) through the shared client.
   *
   * @param values - The form's live values at submit time.
   */
  async function submit(values: SettingsValues): Promise<void> {
    await client.updateProfile(staleSubmit ? captured : values)
    saved = values.name
  }

  /** Restores the server's values into the DOM. */
  function reset(): void {
    form.reset({ name: client.getUser()?.name ?? '', bio: client.getUser()?.bio ?? '' })
  }
</script>

<p role="status" data-testid="settings-saved">{saved ? `Saved ${saved}` : 'Not saved'}</p>
<form aria-label="Settings" onsubmit={form.handleSubmit(submit)}>
  <input
    aria-label="Name"
    name={name.name}
    value={$formState.values.name}
    oninput={name.onChange}
    onblur={name.onBlur}
  />
  <textarea
    aria-label="Bio"
    name={bio.name}
    value={$formState.values.bio}
    oninput={bio.onChange}
    onblur={bio.onBlur}></textarea>
  <button type="submit">Save</button>
  <button type="button" onclick={reset}>Reset</button>
</form>
