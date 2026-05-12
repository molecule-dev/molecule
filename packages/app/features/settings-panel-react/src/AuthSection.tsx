import { useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Flex, Input, Modal, Switch } from '@molecule/app-ui-react'

/**
 * Authentication section — change password (modal) + toggle two-factor.
 *
 * Auto-hides for OAuth-only users (`user.oauthServer` truthy) since
 * password / 2FA wouldn't apply.
 */
export function AuthSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const { status, error, changePassword, reset } = useChangePassword()

  const [showModal, setShowModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorLoading, setTwoFactorLoading] = useState(false)

  // OAuth users skip this section entirely.
  if ((user as unknown as Record<string, unknown>)?.oauthServer) return null

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowModal(false)
      setCurrentPassword('')
      setNewPassword('')
      reset()
    } catch {
      // Error tracked in hook state
    }
  }

  const handleToggleTwoFactor = async (enabled: boolean) => {
    setTwoFactorLoading(true)
    try {
      await http.patch(`/users/${user?.id}`, { data: { twoFactorEnabled: enabled } })
      setTwoFactorEnabled(enabled)
    } catch {
      // Revert on failure
    } finally {
      setTwoFactorLoading(false)
    }
  }

  return (
    <>
      <section>
        <h3 className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>{t('settings.authentication')}</h3>
        <div className={cm.stack(3)}>
          <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
            {t('settings.changePassword')}
          </Button>
          <Flex align="center" justify="between">
            <span className={cm.textSize('sm')}>{t('settings.twoFactor')}</span>
            <Switch
              checked={twoFactorEnabled}
              onChange={(e) => handleToggleTwoFactor((e.target as HTMLInputElement).checked)}
              disabled={twoFactorLoading}
              size="sm"
            />
          </Flex>
        </div>
      </section>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          reset()
        }}
        title={t('settings.changePasswordModal.title')}
      >
        {error && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error.message || t('settings.changePasswordModal.error')}
          </Alert>
        )}
        <form onSubmit={handleChangePassword} className={cm.stack(4)}>
          <div>
            <label htmlFor="current-pw" className={cm.formLabel}>
              {t('settings.changePasswordModal.currentPassword')}
            </label>
            <Input
              id="current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword((e.target as HTMLInputElement).value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label htmlFor="new-pw" className={cm.formLabel}>
              {t('settings.changePasswordModal.newPassword')}
            </label>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword((e.target as HTMLInputElement).value)}
              autoComplete="new-password"
              required
            />
          </div>
          <Button type="submit" fullWidth loading={status === 'pending'}>
            {status === 'pending'
              ? t('settings.changePasswordModal.changing')
              : t('settings.changePassword')}
          </Button>
        </form>
      </Modal>
    </>
  )
}
