<!--
  The recorded manual hydration, as Svelte: every new user object overwrites the
  editable controls, so typed values are lost and a save sends nulls.
-->
<script lang="ts">
  import { onDestroy } from 'svelte'

  import type { AuthClient } from '@molecule/app-auth'

  import { useAuth } from '../../hooks/useAuth.js'
  import type { Reader } from './profile-fixtures.js'

  let { client }: { client: AuthClient<Reader> } = $props()

  const { user } = useAuth<Reader>()
  let bio = $state('')
  let image = $state('')
  const stop = user.subscribe((current) => {
    bio = current?.bio ?? ''
    image = current?.image ?? ''
  })
  onDestroy(stop)

  const submit = (event: SubmitEvent): void => {
    event.preventDefault()
    void client.updateProfile({ bio: bio || null, image: image || null })
  }
</script>

<form aria-label="Profile" onsubmit={submit}>
  <textarea
    aria-label="Bio"
    value={bio}
    oninput={(event) => {
      bio = event.currentTarget.value
    }}></textarea>
  <input
    aria-label="Image"
    value={image}
    oninput={(event) => {
      image = event.currentTarget.value
    }}
  />
  <button type="submit">Save</button>
</form>
