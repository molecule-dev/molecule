<!--
  React's base-form case: `useForm` with external `values` and
  `keepDirtyValues`, driven by a store of options so a late record arrives the
  way React's next render delivers it.
-->
<script lang="ts">
  import { untrack } from 'svelte'
  import type { Readable } from 'svelte/store'

  import { useForm, type UseFormOptions } from '../../hooks/useForm.js'

  interface Fields {
    username: string
    email: string
    bio: string
    image: string
    tags: string[]
  }

  let {
    options,
    onSubmit,
  }: {
    options: Readable<UseFormOptions<Fields>>
    onSubmit: (values: Fields) => void
  } = $props()

  const form = untrack(() => useForm<Fields>(options))
  const { formState } = form
  const bio = form.register('bio')
  const image = form.register('image')
</script>

<form
  aria-label="Settings"
  onsubmit={form.handleSubmit((values) => {
    onSubmit(values)
  })}
>
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
</form>
