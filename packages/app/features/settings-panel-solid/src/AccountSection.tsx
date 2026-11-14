/**
 * The account section.
 *
 * @module
 */

import { createEffect, type JSX, onMount, Show } from 'solid-js'

import type { UserProfile } from '@molecule/app-auth'
import { useAuthClient, useProfileForm, useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Input, Spinner } from '@molecule/app-ui-solid'

interface AccountValues {
  name: string
  email: string
}

/**
 * Account fields over the shared profile lifecycle. Background validation uses
 * the auth client's configured route, mapping and session ownership guards.
 *
 * `UserProfile.email` is optional (phone/handle accounts have none), so email is
 * validated only when non-empty and a blank email is never sent: clearing the
 * field leaves the stored address untouched, and a name-only account can still
 * save its name.
 *
 * @returns The account settings section.
 */
export function AccountSection(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const authClient = useAuthClient<UserProfile>()
  const profile = useProfileForm<UserProfile, AccountValues>({
    defaultValues: { name: '', email: '' },
    toValues: (user) => ({ name: user.name ?? '', email: user.email ?? '' }),
    toPatch: ({ email, ...changes }) => (email ? { ...changes, email } : changes),
  })

  onMount(() => {
    // The auth client owns the route, response mapping and stale-read guards.
    // An older account read must not publish over a save or a different session.
    void authClient.validateSession?.().catch((_error) => {
      // A provider's background validation must not cause an unhandled rejection:
      // render its auth state while useProfileForm reports mutation failures.
    })
  })

  const name = profile.register('name')
  const email = profile.register('email', { email: true })
  // The field's controlled value. `formState()` is the form's notification
  // stream as an accessor, so the input follows loads, saves and account
  // switches; the registration's own `value` is a one-time snapshot.
  const nameValue = (): string => profile.formState().values.name
  const emailValue = (): string => profile.formState().values.email
  // Same anchoring for the validation error: `getError` reads the controller
  // directly, so read the tracked state first to subscribe this expression.
  const emailError = (): string | undefined => {
    profile.formState()
    return profile.getError('email')
  }
  // The latest save failure: the Error's own message, or the shared fallback.
  const saveError = (): string => {
    const failure = profile.error()
    return failure instanceof Error
      ? failure.message
      : t('settings.failedToUpdateProfile', undefined, {
          defaultValue: 'Failed to update profile',
        })
  }
  const saveOnBlur =
    (onBlur: () => void): (() => void) =>
    () => {
      onBlur()
      void profile.submit()
    }

  // React's controlled input re-writes BOTH the attribute and the property on
  // every render, so a save that rewrites a field behind typed text also
  // replaces what the field shows. The Input's `attr:value` covers the
  // attribute; this helper covers the property. It keeps the registration's
  // ref (the form controller needs the element for validation focus) and adds
  // an effect that re-reads the tracked value, React's restore semantics.
  const bindInput = (
    field: { ref?: (element: HTMLElement | null) => void },
    value: () => string,
  ): ((node: HTMLElement | null) => void) => {
    let el: HTMLInputElement | undefined
    return (node) => {
      el = (node as HTMLInputElement | null) ?? undefined
      field.ref?.(node)
      createEffect(() => {
        const input = el
        const next = value()
        if (input && input.value !== next) input.value = next
      })
    }
  }
  const bindName = bindInput(name, nameValue)
  // The email field's validation state rides the same element: React passes
  // `aria-invalid`/`aria-describedby` through the Input's rest spread, which
  // OVERRIDES the component's internal aria-invalid (absent when there is no
  // error, `true` + a describedby reference when there is). Solid's spread
  // cannot remove an attribute the component already rendered, so the same
  // attributes are managed here against the bound element, re-read whenever
  // the tracked validation error changes.
  const bindEmail = (node: HTMLElement | null): void => {
    bindInput(email, emailValue)(node)
    const input = node as HTMLInputElement | null
    createEffect(() => {
      if (!input) return
      const error = emailError()
      if (error) {
        input.setAttribute('aria-invalid', 'true')
        input.setAttribute('aria-describedby', 'settings-email-error')
      } else {
        input.removeAttribute('aria-invalid')
        input.removeAttribute('aria-describedby')
      }
    })
  }

  return (
    <section>
      <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
        <h3 class={cm.sectionHeading}>
          {t('settings.account', undefined, { defaultValue: 'Account' })}
        </h3>
        <Show when={profile.isSubmitting()}>
          <Spinner size="xs" />
        </Show>
      </Flex>
      <form class={cm.stack(3)} onSubmit={profile.formProps.onSubmit}>
        <div>
          <label for="settings-name" class={cm.formLabelSmall}>
            {t('settings.name', undefined, { defaultValue: 'Name' })}
          </label>
          <Input
            value={nameValue()}
            name={name.name}
            onChange={name.onChange}
            onBlur={saveOnBlur(name.onBlur)}
            // `ref` is a forwarded prop here (the Input spreads its rest onto
            // the native input), not a component-level Solid ref, so it rides
            // a spread the way every forwarded attribute does.
            {...{ ref: bindName }}
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
            value={emailValue()}
            name={email.name}
            onChange={email.onChange}
            onBlur={saveOnBlur(email.onBlur)}
            {...{ ref: bindEmail }}
            id="settings-email"
            type="email"
            autoComplete="email"
            size="sm"
          />
          <Show when={emailError()}>
            <p
              id="settings-email-error"
              role="alert"
              class={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}
            >
              {emailError()}
            </p>
          </Show>
          <Show when={profile.error()}>
            <p role="alert" class={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>
              {saveError()}
            </p>
          </Show>
        </div>
      </form>
    </section>
  )
}
