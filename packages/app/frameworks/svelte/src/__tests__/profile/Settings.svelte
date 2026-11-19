<!--
  React's `Settings`: the profile form bound to native inputs, with its tags
  list, submit errors and a submit button disabled until a user is loaded or
  while saving.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useProfileForm } from '../../hooks/useProfileForm.js'

  interface User {
    id: string
    username: string
    email: string
    bio: string
    image: string
    tags: string[]
  }
  type Fields = Omit<User, 'id'>

  let {
    validate,
    initialDefaults = { username: '', email: '', bio: '', image: '', tags: [] },
  }: {
    validate?: (values: Fields) => Promise<Partial<Record<keyof Fields, string>>>
    initialDefaults?: Fields
  } = $props()

  const form = untrack(() =>
    useProfileForm<User, Fields>({
      defaultValues: initialDefaults,
      toValues: ({ username, email, bio, image, tags }) => ({
        username,
        email,
        bio,
        image,
        tags,
      }),
      toPatch: (changes) => changes,
      validate,
    }),
  )
  const { formState, ready, isSubmitting } = form
  const username = form.register('username')
  const email = form.register('email')
  const bio = form.register('bio')
  const image = form.register('image')
</script>

<form aria-label="Settings" onsubmit={form.formProps.onSubmit}>
  <input
    aria-label="Username"
    name={username.name}
    value={$formState.values.username}
    oninput={username.onChange}
    onblur={username.onBlur}
  />
  <input
    aria-label="Email"
    name={email.name}
    value={$formState.values.email}
    oninput={email.onChange}
    onblur={email.onBlur}
  />
  <textarea
    aria-label="Bio"
    name={bio.name}
    value={$formState.values.bio}
    oninput={bio.onChange}
    onblur={bio.onBlur}></textarea>
  <input
    aria-label="Image"
    name={image.name}
    value={$formState.values.image}
    oninput={image.onChange}
    onblur={image.onBlur}
  />
  <output aria-label="Tags">{JSON.stringify($formState.values.tags)}</output>
  <output aria-label="Errors">{JSON.stringify($formState.errors)}</output>
  <button type="button" onclick={() => form.setValue('tags', [])}>Clear tags</button>
  <button type="submit" disabled={!$ready || $isSubmitting}>Save</button>
</form>
