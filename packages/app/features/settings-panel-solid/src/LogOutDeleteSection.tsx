/**
 * The bottom actions section: sign out and delete account.
 *
 * @module
 */

import { createSignal, type JSX, Show } from 'solid-js'

import type { UserProfile } from '@molecule/app-auth'
import { serverErrorMessage } from '@molecule/app-http'
import { useAuth, useHttpClient, useRouter, useTranslation } from '@molecule/app-solid'
import { getClassMap, molIdProps } from '@molecule/app-ui'
import { Alert, Button, Input, Modal } from '@molecule/app-ui-solid'

import { useSettingsPanelContext } from './context.js'

/**
 * Bottom actions section — Log out + Delete account.
 *
 * Owns the delete-account modal internally (the trigger lives in the
 * same section so the modal lives here too). Reads `onClose` from
 * the `<SettingsContainer>` context to dismiss the panel after either
 * action and navigates to `/login`.
 *
 * @returns The bottom actions section.
 */
export function LogOutDeleteSection(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { user, logout } = useAuth<UserProfile>()
  const http = useHttpClient()
  const { onClose } = useSettingsPanelContext()

  const [showModal, setShowModal] = createSignal(false)
  const [password, setPassword] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal('')

  const handleLogout = async (): Promise<void> => {
    await logout()
    onClose()
    navigate('/login')
  }

  const handleDelete = async (e: Event): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await http.delete(`/api/users/${user()?.id}`, { data: { password: password() } })
      await logout()
      onClose()
      navigate('/login')
    } catch (err) {
      setError(
        serverErrorMessage(err) ??
          t('settings.failedToDeleteAccount', undefined, {
            defaultValue: 'Failed to delete account.',
          }),
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section class={cm.stack(3)}>
        <Button
          color="error"
          fullWidth
          onClick={() => void handleLogout()}
          {...molIdProps('user-menu-logout')}
        >
          {t('settings.logOut', undefined, { defaultValue: 'Sign out' })}
        </Button>
        <Button
          variant="ghost"
          fullWidth
          onClick={() => setShowModal(true)}
          {...molIdProps('user-menu-delete-account')}
        >
          {t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
        </Button>
      </section>

      <Modal
        open={showModal()}
        onClose={() => setShowModal(false)}
        title={t('settings.deleteAccountModal.title', undefined, {
          defaultValue: 'Delete Account',
        })}
      >
        <p class={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))}>
          {t('settings.deleteAccountModal.warning', undefined, {
            defaultValue: 'This action cannot be undone. Please enter your password to confirm.',
          })}
        </p>
        <Show when={error()}>
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error()}
          </Alert>
        </Show>
        <form class={cm.stack(4)} onSubmit={(e) => void handleDelete(e)}>
          <div>
            <label for="delete-pw" class={cm.formLabel}>
              {t('settings.deleteAccountModal.password', undefined, { defaultValue: 'Password' })}
            </label>
            <Input
              id="delete-pw"
              type="password"
              value={password()}
              onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={loading()}>
            {loading()
              ? t('settings.deleteAccountModal.deleting', undefined, {
                  defaultValue: 'Deleting...',
                })
              : t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
          </Button>
        </form>
      </Modal>
    </>
  )
}
