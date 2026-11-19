<!--
  React's `ManagedAccountEditor`: the profile form bound to native inputs, with
  its submit button disabled until a user is loaded or while saving.
-->
<script lang="ts">
  import { useProfileForm } from '../../hooks/useProfileForm.js'

  interface Account {
    memberKey: string
    displayName: string
    timezone: string
  }
  interface AccountValues {
    displayName: string
    timezone: string
  }

  const form = useProfileForm<Account, AccountValues>({
    defaultValues: { displayName: '', timezone: '' },
    toValues: (user) => ({ displayName: user.displayName, timezone: user.timezone }),
    toPatch: (changes) => changes,
  })
  const { formState, ready, isSubmitting } = form
  const displayName = form.register('displayName')
  const timezone = form.register('timezone')
</script>

<form aria-label="Account" onsubmit={form.formProps.onSubmit}>
  <input
    aria-label="Account name"
    name={displayName.name}
    value={$formState.values.displayName}
    oninput={displayName.onChange}
    onblur={displayName.onBlur}
  />
  <input
    aria-label="Timezone"
    name={timezone.name}
    value={$formState.values.timezone}
    oninput={timezone.onChange}
    onblur={timezone.onBlur}
  />
  <button type="submit" disabled={!$ready || $isSubmitting}>Save</button>
</form>
