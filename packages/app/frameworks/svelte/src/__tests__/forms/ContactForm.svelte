<!--
  React's `ContactForm`: one required email field created through an explicit
  provider factory, its error, its submit status and its disabled button.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import type { FormProvider } from '@molecule/app-forms'

  import { useForm } from '../../hooks/useForm.js'
  import { fieldRef } from './field-ref.js'

  let {
    createForm,
    onSubmit,
  }: {
    createForm: FormProvider['createForm']
    onSubmit: (values: { email: string }) => void | Promise<void>
  } = $props()

  const form = untrack(() =>
    useForm({
      createForm,
      defaultValues: { email: '' },
    }),
  )
  const field = form.register('email', { required: 'Email required' })
  const { formState, isSubmitting } = form
  const submit = untrack(() => form.handleSubmit(onSubmit))
</script>

<form aria-label="Contact" onsubmit={submit}>
  <input
    aria-label="Email"
    name={field.name}
    value={$formState.values.email}
    oninput={field.onChange}
    onblur={field.onBlur}
    use:fieldRef={field.ref}
  />
  <button disabled={$isSubmitting}>Submit</button>
  {#if $formState.errors.email}<p role="alert">{$formState.errors.email}</p>{/if}
  <p role="status">{$isSubmitting ? 'Submitting' : 'Idle'}</p>
</form>
