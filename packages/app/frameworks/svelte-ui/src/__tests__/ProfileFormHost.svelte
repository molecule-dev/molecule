<!--
  Test host: a Form whose onSubmit is the REAL `useForm` submit handler (from
  `@molecule/app-svelte`), with no app-owned error catch — the path the React
  `ProfileForm` test exercises.
-->
<script lang="ts">
  import { useForm } from '@molecule/app-svelte'

  import Form from '../components/Form.svelte'

  const form = useForm({ defaultValues: { bio: 'Draft bio' } })
  const submit = form.handleSubmit(async () => {
    throw new Error('Save rejected')
  })
</script>

<Form
  onSubmit={(event: Event) => {
    event.preventDefault()
    return submit()
  }}
>
  <input name="bio" value="Draft bio" />
  <button>Save profile</button>
</Form>
