/**
 * Vue account settings section: name/email fields over the shared profile
 * form lifecycle.
 *
 * Vue counterpart of `@molecule/app-settings-panel-react`'s
 * `AccountSection` — the same DOM, callbacks and service calls.
 *
 * @module
 */

import { type ComponentPublicInstance, defineComponent, h, onMounted, type VNodeChild } from 'vue'

import type { UserProfile } from '@molecule/app-auth'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Input, Spinner } from '@molecule/app-ui-vue'
import { useAuthClient, useProfileForm, useTranslation } from '@molecule/app-vue'

/** The account section's controlled values. */
export interface AccountValues {
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
 * @returns The account settings section component.
 */
export const AccountSection = defineComponent({
  name: 'AccountSection',
  setup() {
    const cm = getClassMap()
    const { t } = useTranslation()
    const authClient = useAuthClient<UserProfile>()
    const profile = useProfileForm<UserProfile, AccountValues>({
      defaultValues: { name: '', email: '' },
      toValues: (user) => ({ name: user.name ?? '', email: user.email ?? '' }),
      toPatch: ({ email, ...changes }) => (email ? { ...changes, email } : changes),
    })

    onMounted(() => {
      // The auth client owns the route, response mapping and stale-read guards.
      // An older account read must not publish over a save or a different session.
      void authClient.validateSession?.().catch((_error) => {
        // A provider's background validation must not cause an unhandled rejection:
        // render its auth state while useProfileForm reports mutation failures.
      })
    })

    /**
     * Wraps a field's blur handler so the form saves after the field marks
     * itself touched — the same save-on-blur React's version wires.
     *
     * @param onBlur - The registered field's blur handler.
     * @returns A blur handler that saves the form.
     */
    const saveOnBlur =
      (onBlur: () => void): (() => void) =>
      () => {
        onBlur()
        void profile.submit()
      }

    // React's Input forwards the registration's element ref, which the form
    // controller stores for `shouldFocusError` (a failed submit focuses the
    // first field with an error). The Vue Input's public instance exposes its
    // wrapper div as `$el`, so a stable per-field ref forwards the native
    // input to the CURRENT registration.
    type RegisteredField = ReturnType<typeof profile.register>
    const registrations: { name?: RegisteredField; email?: RegisteredField } = {}

    /**
     * Builds a stable component ref that forwards the Input's native field
     * element to the registration captured at the latest render.
     *
     * @param field - Which field's registration to forward to.
     * @returns The component ref callback.
     */
    const fieldRef =
      (field: 'name' | 'email') =>
      (instance: Element | ComponentPublicInstance | null): void => {
        const root =
          instance === null || instance instanceof Element
            ? null
            : ((instance as ComponentPublicInstance).$el as HTMLElement | null)
        registrations[field]?.ref?.((root?.querySelector('input') ?? null) as HTMLElement | null)
      }
    const nameFieldRef = fieldRef('name')
    const emailFieldRef = fieldRef('email')

    return (): VNodeChild => {
      // The subscription snapshot makes the render reactive to every form
      // state change (values, errors, submit flag), like React's re-render.
      void profile.formState.value
      const name = profile.register('name')
      const email = profile.register('email', { email: true })
      registrations.name = name
      registrations.email = email
      const emailError = profile.getError('email')

      return h('section', [
        h(Flex, { align: 'center', gap: 'sm', className: cm.sp('mb', 3) }, () => [
          h('h3', { class: cm.sectionHeading }, [
            t('settings.account', undefined, { defaultValue: 'Account' }),
          ]),
          profile.isSubmitting.value ? h(Spinner, { size: 'xs' }) : null,
        ]),
        h('form', { ...profile.formProps, class: cm.stack(3) }, [
          h('div', [
            h(
              'label',
              { for: 'settings-name', class: cm.formLabelSmall },
              t('settings.name', undefined, { defaultValue: 'Name' }),
            ),
            h(Input, {
              ref: nameFieldRef,
              name: name.name,
              value: name.value,
              onChange: name.onChange,
              onBlur: saveOnBlur(name.onBlur),
              id: 'settings-name',
              type: 'text',
              autoComplete: 'name',
              size: 'sm',
            }),
          ]),
          h('div', [
            h(
              'label',
              { for: 'settings-email', class: cm.formLabelSmall },
              t('settings.email', undefined, { defaultValue: 'Email' }),
            ),
            h(Input, {
              ref: emailFieldRef,
              name: email.name,
              value: email.value,
              onChange: email.onChange,
              onBlur: saveOnBlur(email.onBlur),
              id: 'settings-email',
              type: 'email',
              autoComplete: 'email',
              size: 'sm',
              'aria-invalid': emailError ? true : undefined,
              'aria-describedby': emailError ? 'settings-email-error' : undefined,
            }),
            emailError
              ? h(
                  'p',
                  {
                    id: 'settings-email-error',
                    role: 'alert',
                    class: cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1)),
                  },
                  [emailError],
                )
              : null,
            profile.error.value
              ? h(
                  'p',
                  { role: 'alert', class: cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1)) },
                  [
                    profile.error.value instanceof Error
                      ? profile.error.value.message
                      : t('settings.failedToUpdateProfile', undefined, {
                          defaultValue: 'Failed to update profile',
                        }),
                  ],
                )
              : null,
          ]),
        ]),
      ])
    }
  },
})
