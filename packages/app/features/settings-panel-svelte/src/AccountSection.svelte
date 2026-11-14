<!--
  AccountSection: account fields over the shared profile lifecycle.
  Background validation uses the auth client's configured route, mapping and
  session ownership guards. `UserProfile.email` is optional (phone/handle
  accounts have none), so email is validated only when non-empty and a blank
  email is never sent: clearing the field leaves the stored address
  untouched, and a name-only account can still save its name.
-->
<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'
  import { useAuthClient, useProfileForm, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Flex, Input, Spinner } from '@molecule/app-ui-svelte'

  import type { AccountValues } from './types.js'

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const authClient = useAuthClient<UserProfile>()
  const profile = useProfileForm<UserProfile, AccountValues>({
    defaultValues: { name: '', email: '' },
    toValues: (user) => ({ name: user.name ?? '', email: user.email ?? '' }),
    toPatch: ({ email, ...changes }) => (email ? { ...changes, email } : changes),
  })
  const { formState, isSubmitting, error: profileError, submit: submitProfile } = profile

  const nameField = profile.register('name')
  const emailField = profile.register('email', { email: true })

  $effect(() => {
    // The auth client owns the route, response mapping and stale-read guards.
    // An older account read must not publish over a save or a different session.
    void authClient.validateSession?.().catch((_error) => {
      // A provider's background validation must not cause an unhandled rejection:
      // render its auth state while useProfileForm reports mutation failures.
    })
  })

  // React hands the form controller the input element through each
  // registration's `ref`, which its failed-submit focus uses. The shared
  // Svelte Input has no ref channel, so this hands the controller the
  // elements by the ids this section gave them — the same elements, the
  // same callback.
  $effect(() => {
    nameField.ref?.(document.getElementById('settings-name'))
    emailField.ref?.(document.getElementById('settings-email'))
    return () => {
      nameField.ref?.(null)
      emailField.ref?.(null)
    }
  })

  const emailError = $derived($formState.errors.email)
  const saveOnBlur =
    (onBlur: () => void): (() => void) =>
    () => {
      onBlur()
      void submitProfile()
    }
</script>

<section>
  <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
    <h3 class={cm.sectionHeading}>
      {t('settings.account', undefined, { defaultValue: 'Account' })}
    </h3>
    {#if $isSubmitting}<Spinner size="xs" />{/if}
  </Flex>
  <form onsubmit={profile.formProps.onSubmit} class={cm.stack(3)}>
    <div>
      <label for="settings-name" class={cm.formLabelSmall}>
        {t('settings.name', undefined, { defaultValue: 'Name' })}
      </label>
      <Input
        value={$formState.values.name}
        name={nameField.name}
        onChange={nameField.onChange}
        onBlur={saveOnBlur(nameField.onBlur)}
        id="settings-name"
        type="text"
        autoComplete="name"
        size="sm"
      />
    </div>
    <div>
      <label for="settings-email" class={cm.formLabelSmall}>
        {t('settings.email', undefined, { defaultValue: 'Email' })}
      </label>
      <Input
        value={$formState.values.email}
        name={emailField.name}
        onChange={emailField.onChange}
        onBlur={saveOnBlur(emailField.onBlur)}
        id="settings-email"
        type="email"
        autoComplete="email"
        size="sm"
        aria-invalid={emailError ? 'true' : undefined}
        aria-describedby={emailError ? 'settings-email-error' : undefined}
      />
      {#if emailError}
        <p
          id="settings-email-error"
          role="alert"
          class={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}
        >
          {emailError}
        </p>
      {/if}
      {#if $profileError}
        <p role="alert" class={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>
          {$profileError instanceof Error
            ? $profileError.message
            : t('settings.failedToUpdateProfile', undefined, {
                defaultValue: 'Failed to update profile',
              })}
        </p>
      {/if}
    </div>
  </form>
</section>
