/**
 * Vue bottom actions section: Log out + Delete account over the container's
 * panel context.
 *
 * Vue counterpart of `@molecule/app-settings-panel-react`'s
 * `LogOutDeleteSection` — the same DOM, callbacks and service calls.
 *
 * @module
 */

import { defineComponent, h, type Ref, ref, type VNodeChild } from 'vue'

import type { UserProfile } from '@molecule/app-auth'
import { serverErrorMessage } from '@molecule/app-http'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, Modal } from '@molecule/app-ui-vue'
import { useAuth, useHttpClient, useRouter, useTranslation } from '@molecule/app-vue'

import { useSettingsPanelContext } from './context.js'

/**
 * Bottom actions section — Log out + Delete account.
 *
 * Owns the delete-account modal internally (the trigger lives in the
 * same section so the modal lives here too). Reads `onClose` from
 * the `<SettingsContainer>` context to dismiss the panel after either
 * action and navigates to `/login`.
 *
 * @returns The log out / delete account section component.
 */
export const LogOutDeleteSection = defineComponent({
  name: 'LogOutDeleteSection',
  setup() {
    const cm = getClassMap()
    const { t } = useTranslation()
    const router = useRouter()
    const { user, logout } = useAuth<UserProfile>()
    const http = useHttpClient()
    const { onClose } = useSettingsPanelContext()

    const showModal: Ref<boolean> = ref(false)
    const password: Ref<string> = ref('')
    const loading: Ref<boolean> = ref(false)
    const error: Ref<string> = ref('')

    /** Signs out, dismisses the panel and returns to the login route. */
    const handleLogout = async (): Promise<void> => {
      await logout()
      onClose()
      router.navigate('/login')
    }

    /**
     * Submits the delete-account form; a refusal shows the server's message
     * and keeps the modal open.
     *
     * @param event - The native form submit event.
     */
    const handleDelete = async (event: Event): Promise<void> => {
      event.preventDefault()
      loading.value = true
      error.value = ''
      try {
        await http.delete(`/api/users/${user.value?.id}`, { data: { password: password.value } })
        await logout()
        onClose()
        router.navigate('/login')
      } catch (err) {
        error.value =
          serverErrorMessage(err) ??
          t('settings.failedToDeleteAccount', undefined, {
            defaultValue: 'Failed to delete account.',
          })
      } finally {
        loading.value = false
      }
    }

    return (): VNodeChild => [
      h('section', { class: cm.stack(3) }, [
        h(
          Button,
          {
            color: 'error',
            fullWidth: true,
            onClick: () => void handleLogout(),
            'data-mol-id': 'user-menu-logout',
          },
          () => [t('settings.logOut', undefined, { defaultValue: 'Sign out' })],
        ),
        h(
          Button,
          {
            variant: 'ghost',
            fullWidth: true,
            onClick: () => (showModal.value = true),
            'data-mol-id': 'user-menu-delete-account',
          },
          () => [t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })],
        ),
      ]),
      h(
        Modal,
        {
          open: showModal.value,
          onClose: () => (showModal.value = false),
          title: t('settings.deleteAccountModal.title', undefined, {
            defaultValue: 'Delete Account',
          }),
        },
        {
          default: () => [
            h('p', { class: cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4)) }, [
              t('settings.deleteAccountModal.warning', undefined, {
                defaultValue:
                  'This action cannot be undone. Please enter your password to confirm.',
              }),
            ]),
            error.value
              ? h(Alert, { status: 'error', className: cm.sp('mb', 4) }, () => [error.value])
              : null,
            h('form', { onSubmit: handleDelete, class: cm.stack(4) }, [
              h('div', [
                h(
                  'label',
                  { for: 'delete-pw', class: cm.formLabel },
                  t('settings.deleteAccountModal.password', undefined, {
                    defaultValue: 'Password',
                  }),
                ),
                h(Input, {
                  id: 'delete-pw',
                  type: 'password',
                  value: password.value,
                  onChange: (e: Event) => (password.value = (e.target as HTMLInputElement).value),
                  required: true,
                }),
              ]),
              h(
                Button,
                { type: 'submit', color: 'error', fullWidth: true, loading: loading.value },
                () => [
                  loading.value
                    ? t('settings.deleteAccountModal.deleting', undefined, {
                        defaultValue: 'Deleting...',
                      })
                    : t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' }),
                ],
              ),
            ]),
          ],
        },
      ),
    ]
  },
})
