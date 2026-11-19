<!--
  React's bonded-default `ProfileForm`: one required name field created through
  the bonded forms provider, with its clean/dirty status.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { useForm } from '../../hooks/useForm.js'
  import { fieldRef } from './field-ref.js'

  let { onSubmit }: { onSubmit: (values: { name: string }) => void | Promise<void> } = $props()

  const form = untrack(() => useForm({ defaultValues: { name: '' } }))
  const field = form.register('name', { required: 'Name required' })
  const { formState, isDirty } = form
  const submit = untrack(() => form.handleSubmit(onSubmit))
</script>

<form aria-label="Profile" onsubmit={submit}>
  <input
    aria-label="Name"
    name={field.name}
    value={$formState.values.name}
    oninput={field.onChange}
    onblur={field.onBlur}
    use:fieldRef={field.ref}
  />
  <p role="status">{$isDirty ? 'Dirty' : 'Clean'}</p>
</form>
