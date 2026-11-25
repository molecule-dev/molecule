import { useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { serverErrorMessage } from '@molecule/app-http'
import { useAuth, useHttpClient, useNavigate, useTranslation } from '@molecule/app-react'
import { getClassMap, type KitEvent } from '@molecule/app-ui'
import { Alert, Button, Input, Modal } from '@molecule/app-ui-react'
import { Box, FormArea, Text } from '@molecule/app-ui-react/elements'

import { useSettingsPanelContext } from './context.js'

/**
 * Bottom actions section — Log out + Delete account.
 *
 * Owns the delete-account modal internally (the trigger lives in the
 * same section so the modal lives here too). Reads `onClose` from
 * the `<SettingsContainer>` context to dismiss the panel after either
 * action and navigates to `/login`.
 */
export function LogOutDeleteSection(): React.JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()
  const http = useHttpClient()
  const { onClose } = useSettingsPanelContext()

  const [showModal, setShowModal] = useState(false)
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogout = async (): Promise<void> => {
    await logout()
    onClose()
    navigate('/login')
  }

  const handleDelete = async (e: KitEvent): Promise<void> => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await http.delete(`/api/users/${user?.id}`, { data: { password } })
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
      <Box as="section" className={cm.stack(3)}>
        <Button color="error" fullWidth onClick={handleLogout} data-mol-id="user-menu-logout">
          {t('settings.logOut', undefined, { defaultValue: 'Sign out' })}
        </Button>
        <Button
          variant="ghost"
          fullWidth
          onClick={() => setShowModal(true)}
          data-mol-id="user-menu-delete-account"
        >
          {t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
        </Button>
      </Box>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={t('settings.deleteAccountModal.title', undefined, {
          defaultValue: 'Delete Account',
        })}
      >
        <Text as="p" className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))}>
          {t('settings.deleteAccountModal.warning', undefined, {
            defaultValue: 'This action cannot be undone. Please enter your password to confirm.',
          })}
        </Text>
        {error && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error}
          </Alert>
        )}
        <FormArea as="form" onSubmit={handleDelete} className={cm.stack(4)}>
          <Box as="div">
            <Text as="label" htmlFor="delete-pw" className={cm.formLabel}>
              {t('settings.deleteAccountModal.password', undefined, { defaultValue: 'Password' })}
            </Text>
            <Input
              id="delete-pw"
              type="password"
              value={password}
              onChange={({ target }) => {
                if (target && 'value' in target && typeof target.value === 'string') {
                  setPassword(target.value)
                }
              }}
              required
            />
          </Box>
          <Button type="submit" color="error" fullWidth loading={loading}>
            {loading
              ? t('settings.deleteAccountModal.deleting', undefined, {
                  defaultValue: 'Deleting...',
                })
              : t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
          </Button>
        </FormArea>
      </Modal>
    </>
  )
}
