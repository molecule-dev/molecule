import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Flex, Input, Modal } from '@molecule/app-ui-react'

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

/**
 * Authentication section — change password (modal) + two-factor (TOTP) setup.
 *
 * Two-factor uses the real enrollment flow against the user resource's
 * `POST /users/:id/verify-two-factor` endpoint (`@molecule/api-two-factor`):
 * - Enable → `{action:'setup'}` returns a QR code + secret to scan into an
 *   authenticator app → user enters the 6-digit code → `{action:'enable', token}`.
 * - Disable → user enters a current code → `{action:'disable', token}`.
 * The current status is read from `/users/me`. (This replaces the previous
 * boolean toggle, which PATCHed `twoFactorEnabled` — a field the update
 * handler deliberately ignores — so it never actually enrolled 2FA.)
 *
 * Auto-hides for OAuth-only users (`user.oauthServer` truthy) since
 * password / 2FA wouldn't apply. If the app's API has no two-factor
 * provider bonded, setup fails gracefully with an inline message.
 */
export function AuthSection(): JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const { status, error, changePassword, reset } = useChangePassword()

  const [showModal, setShowModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const userId = (user as unknown as { id?: string })?.id
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  // Read the persisted 2FA status from /users/me on mount.
  useEffect(() => {
    let cancelled = false
    http
      .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: Record<string, unknown> }).data ?? res
        const u = ((body as { props?: Record<string, unknown> }).props ?? body) as {
          twoFactorEnabled?: boolean
        }
        setTwoFactorEnabled(Boolean(u?.twoFactorEnabled))
      })
      .catch(() => {
        /* status read is best-effort; defaults to disabled */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  // OAuth users skip this section entirely.
  if ((user as unknown as Record<string, unknown>)?.oauthServer) return null

  const closeTf = (): void => {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError('')
  }

  const startEnable = async (): Promise<void> => {
    setTfError('')
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      setTfSetup(data)
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('settings.twoFactorUnavailable', undefined, {
              defaultValue: 'Two-factor authentication is not available for this app.',
            }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const submitTf = async (action: 'enable' | 'disable'): Promise<void> => {
    setTfError('')
    setTfLoading(true)
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTf()
    } catch (err) {
      setTfError(
        err instanceof Error
          ? err.message
          : t('settings.twoFactorInvalidCode', undefined, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      setShowModal(false)
      setCurrentPassword('')
      setNewPassword('')
      reset()
    } catch (_error) {
      // Error tracked in hook state — useChangePassword surfaces it via `error`.
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
            <span className={cm.textSize('sm')}>
              {t('settings.twoFactor')}
              {twoFactorEnabled ? (
                <span className={cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))}>
                  {t('settings.twoFactorOn', undefined, { defaultValue: 'On' })}
                </span>
              ) : null}
            </span>
            {twoFactorEnabled ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setTfError('')
                  setTfToken('')
                  setTfModal('disable')
                }}
                data-mol-id="two-factor-disable"
              >
                {t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' })}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={startEnable}
                data-mol-id="two-factor-enable"
              >
                {t('settings.twoFactorEnable', undefined, { defaultValue: 'Enable' })}
              </Button>
            )}
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

      <Modal
        open={tfModal !== null}
        onClose={closeTf}
        title={
          tfModal === 'disable'
            ? t('settings.twoFactorDisableTitle', undefined, {
                defaultValue: 'Disable two-factor authentication',
              })
            : t('settings.twoFactorEnableTitle', undefined, {
                defaultValue: 'Enable two-factor authentication',
              })
        }
      >
        {tfError && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {tfError}
          </Alert>
        )}
        {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
          <div className={cm.cn(cm.stack(3), cm.sp('mb', 4))}>
            <p className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
              {t('settings.twoFactorScan', undefined, {
                defaultValue:
                  'Scan this QR code with your authenticator app, then enter the 6-digit code.',
              })}
            </p>
            <img
              src={tfSetup.QRImageUrl}
              alt={t('settings.twoFactorQrAlt', undefined, { defaultValue: 'Two-factor QR code' })}
              className={cm.cn('mx-auto', cm.maxW('xs'))}
            />
            {tfSetup.secret ? (
              <p className={cm.cn(cm.textSize('xs'), cm.textSubtle, 'text-center break-all')}>
                {tfSetup.secret}
              </p>
            ) : null}
          </div>
        ) : null}
        {(tfModal === 'disable' || tfSetup) && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
            }}
            className={cm.stack(4)}
          >
            <div>
              <label htmlFor="tf-token" className={cm.formLabel}>
                {t('settings.twoFactorCode', undefined, { defaultValue: 'Authentication code' })}
              </label>
              <Input
                id="tf-token"
                type="text"
                value={tfToken}
                onChange={(e) => setTfToken((e.target as HTMLInputElement).value)}
                autoComplete="one-time-code"
                required
              />
            </div>
            <Button
              type="submit"
              color={tfModal === 'disable' ? 'error' : undefined}
              fullWidth
              loading={tfLoading}
            >
              {tfModal === 'disable'
                ? t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' })
                : t('settings.twoFactorVerify', undefined, { defaultValue: 'Verify & enable' })}
            </Button>
          </form>
        )}
      </Modal>
    </>
  )
}
