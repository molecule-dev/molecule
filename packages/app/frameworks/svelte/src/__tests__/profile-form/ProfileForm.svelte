<!--
  React's `ProfileForm`: the profile form bound to native inputs, with its email
  error, form state, save error, a Save button disabled until a user is loaded
  or while saving, and a Reset button.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useProfileForm } from '../../hooks/useProfileForm.js'
  import { fieldRef } from '../forms/field-ref.js'
  import { defaults, type Fields, type Reader, valuesFor } from './profile-fixtures.js'
  import ProfileSummary from './ProfileSummary.svelte'

  let {
    onSaved,
    validate,
  }: {
    onSaved?: (user: Reader) => void | Promise<void>
    validate?: (values: Fields) => Promise<Partial<Record<keyof Fields, string>>>
  } = $props()

  const form = untrack(() =>
    useProfileForm<Reader, Fields>({
      defaultValues: defaults,
      getIdentity: (user) => user.id,
      toValues: valuesFor,
      toPatch: ({ password, ...changes }) => ({
        ...changes,
        ...('bio' in changes ? { bio: changes.bio?.trim() ? changes.bio : null } : {}),
        ...('image' in changes ? { image: changes.image?.trim() ? changes.image : null } : {}),
        ...(password?.trim() ? { password } : {}),
      }),
      onSaved,
      validate,
    }),
  )
  const { formState, ready, isSubmitting, isDirty, error } = form
  const name = form.register('name')
  const email = form.register('email', { email: true })
  const bio = form.register('bio')
  const image = form.register('image')
  const password = form.register('password')
</script>

<div>
  <form aria-label="Profile" onsubmit={form.formProps.onSubmit}>
    <input
      aria-label="Name"
      name={name.name}
      value={$formState.values.name}
      oninput={name.onChange}
      onblur={name.onBlur}
      use:fieldRef={name.ref}
    />
    <input
      aria-label="Email"
      name={email.name}
      value={$formState.values.email}
      oninput={email.onChange}
      onblur={email.onBlur}
      use:fieldRef={email.ref}
    />
    {#if $formState.errors.email}<p role="alert">{$formState.errors.email}</p>{/if}
    <textarea
      aria-label="Bio"
      name={bio.name}
      value={$formState.values.bio}
      oninput={bio.onChange}
      onblur={bio.onBlur}
      use:fieldRef={bio.ref}></textarea>
    <input
      aria-label="Image"
      name={image.name}
      value={$formState.values.image}
      oninput={image.onChange}
      onblur={image.onBlur}
      use:fieldRef={image.ref}
    />
    <input
      aria-label="Password"
      type="password"
      name={password.name}
      value={$formState.values.password}
      oninput={password.onChange}
      onblur={password.onBlur}
      use:fieldRef={password.ref}
    />
    <button type="submit" disabled={!$ready || $isSubmitting}>Save</button>
    <button type="button" onclick={form.reset}>Reset</button>
  </form>
  <output aria-label="Form state">
    {JSON.stringify({ dirty: $isDirty, saving: $isSubmitting })}
  </output>
  {#if $error !== undefined}<p role="alert">Save failed</p>{/if}
  <ProfileSummary />
</div>
