import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Input, Modal } from '@molecule/app-ui-react'

import { useSettingsPanelContext } from './context.js'

/**
 * Bottom actions section — Log out + Delete account.
 *
 * Owns the delete-account modal internally (the trigger lives in the
 * same section so the modal lives here too). Reads `onClose` from
 * the `<SettingsContainer>` context to dismiss the panel after either
 * action and navigates to `/login`.
 */
export function LogOutDeleteSection() {
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

  const handleLogout = async () => {
    await logout()
    onClose()
    navigate('/login')
  }

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await http.delete(`/api/users/${user?.id}`, { data: { password } })
      await logout()
      onClose()
      navigate('/login')
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.failedToDeleteAccount'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <section className={cm.stack(3)}>
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
      </section>

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={t('settings.deleteAccountModal.title')}
      >
        <p className={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))}>
          {t('settings.deleteAccountModal.warning')}
        </p>
        {error && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error}
          </Alert>
        )}
        <form onSubmit={handleDelete} className={cm.stack(4)}>
          <div>
            <label htmlFor="delete-pw" className={cm.formLabel}>
              {t('settings.deleteAccountModal.password')}
            </label>
            <Input
              id="delete-pw"
              type="password"
              value={password}
              onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
              required
            />
          </div>
          <Button type="submit" color="error" fullWidth loading={loading}>
            {loading ? t('settings.deleteAccountModal.deleting') : t('settings.deleteAccount')}
          </Button>
        </form>
      </Modal>
    </>
  )
}
