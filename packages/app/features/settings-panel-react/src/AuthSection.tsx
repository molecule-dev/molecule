import type { JSX } from 'react'
import { useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { serverErrorMessage } from '@molecule/app-http'
import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap, type KitEvent } from '@molecule/app-ui'
import { Alert, Button, Flex, Input, Modal } from '@molecule/app-ui-react'
import { Box, FormArea, Image, Text } from '@molecule/app-ui-react/elements'

/** The two-factor enrollment payload `POST /users/:id/verify-two-factor` answers with. */
export interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

/** Reads the value supplied by the input in either renderer. */
function inputValue(event: KitEvent): string {
  const target = event.target
  return target && 'value' in target && typeof target.value === 'string' ? target.value : ''
}

/** Options for {@link AuthSection}. */
export interface AuthSectionProps {
  /**
   * Show the two-factor row. Set false when the API has no two-factor provider
   * (no `POST /users/:id/verify-two-factor` route). Default true.
   */
  twoFactor?: boolean
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
 * password / 2FA wouldn't apply. Pass `twoFactor={false}` when the app's API
 * has no two-factor provider: it then serves no `verify-two-factor` route, so
 * the section shows only the password change and reads no 2FA status.
 *
 * @param props - The section's options.
 * @param props.twoFactor - Show the two-factor row (default true).
 * @returns The section, or null for an OAuth-only user.
 */
export function AuthSection({ twoFactor = true }: AuthSectionProps = {}): JSX.Element | null {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const { status, error, changePassword, reset } = useChangePassword()

  const [showModal, setShowModal] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const userId = user?.id
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState('')

  // Read the persisted 2FA status from /users/me on mount.
  useEffect(() => {
    if (!twoFactor) return
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
      .catch((_error) => {
        /* status read is best-effort; defaults to disabled */
      })
    return () => {
      cancelled = true
    }
  }, [http, twoFactor])

  // OAuth users skip this section entirely.
  if (user?.oauthServer) return null

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
        serverErrorMessage(err) ??
          t('settings.twoFactorUnavailable', undefined, {
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
        serverErrorMessage(err) ??
          t('settings.twoFactorInvalidCode', undefined, { defaultValue: 'Invalid code' }),
      )
    } finally {
      setTfLoading(false)
    }
  }

  const handleChangePassword = async (e: KitEvent): Promise<void> => {
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
      <Box as="section">
        <Text as="h3" className={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
          {t('settings.authentication', undefined, { defaultValue: 'Authentication' })}
        </Text>
        <Box as="div" className={cm.stack(3)}>
          <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
            {t('settings.changePassword', undefined, { defaultValue: 'Change password' })}
          </Button>
          {twoFactor && (
            <Flex align="center" justify="between">
              <Text as="span" className={cm.textSize('sm')}>
                {t('settings.twoFactor', undefined, { defaultValue: 'Two-factor authentication' })}
                {twoFactorEnabled ? (
                  <Text
                    as="span"
                    className={cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))}
                  >
                    {t('settings.twoFactorOn', undefined, { defaultValue: 'On' })}
                  </Text>
                ) : null}
              </Text>
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
          )}
        </Box>
      </Box>

      <Modal
        open={showModal}
        onClose={() => {
          setShowModal(false)
          reset()
        }}
        title={t('settings.changePasswordModal.title', undefined, {
          defaultValue: 'Change Password',
        })}
      >
        {error && (
          <Alert status="error" className={cm.sp('mb', 4)}>
            {error.message ||
              t('settings.changePasswordModal.error', undefined, {
                defaultValue: 'Failed to change password.',
              })}
          </Alert>
        )}
        <FormArea as="form" onSubmit={handleChangePassword} className={cm.stack(4)}>
          <Box as="div">
            <Text as="label" htmlFor="current-pw" className={cm.formLabel}>
              {t('settings.changePasswordModal.currentPassword', undefined, {
                defaultValue: 'Current Password',
              })}
            </Text>
            <Input
              id="current-pw"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(inputValue(e))}
              autoComplete="current-password"
              required
            />
          </Box>
          <Box as="div">
            <Text as="label" htmlFor="new-pw" className={cm.formLabel}>
              {t('settings.changePasswordModal.newPassword', undefined, {
                defaultValue: 'New Password',
              })}
            </Text>
            <Input
              id="new-pw"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(inputValue(e))}
              autoComplete="new-password"
              required
            />
          </Box>
          <Button type="submit" fullWidth loading={status === 'pending'}>
            {status === 'pending'
              ? t('settings.changePasswordModal.changing', undefined, {
                  defaultValue: 'Changing...',
                })
              : t('settings.changePassword', undefined, { defaultValue: 'Change password' })}
          </Button>
        </FormArea>
      </Modal>

      {twoFactor && (
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
            <Box as="div" className={cm.cn(cm.stack(3), cm.sp('mb', 4))}>
              <Text as="p" className={cm.cn(cm.textSize('sm'), cm.textMuted)}>
                {t('settings.twoFactorScan', undefined, {
                  defaultValue:
                    'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                })}
              </Text>
              <Image
                src={tfSetup.QRImageUrl}
                alt={t('settings.twoFactorQrAlt', undefined, {
                  defaultValue: 'Two-factor QR code',
                })}
                className={cm.cn(cm.mxAuto, cm.maxW('xs'))}
              />
              {tfSetup.secret ? (
                <Text
                  as="p"
                  className={cm.cn(
                    cm.textSize('xs'),
                    cm.textSubtle,
                    cm.settingsPanelTwoFactorSecret,
                  )}
                >
                  {tfSetup.secret}
                </Text>
              ) : null}
            </Box>
          ) : null}
          {(tfModal === 'disable' || tfSetup) && (
            <FormArea
              as="form"
              onSubmit={(e) => {
                e.preventDefault()
                void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
              }}
              className={cm.stack(4)}
            >
              <Box as="div">
                <Text as="label" htmlFor="tf-token" className={cm.formLabel}>
                  {t('settings.twoFactorCode', undefined, { defaultValue: 'Authentication code' })}
                </Text>
                <Input
                  id="tf-token"
                  type="text"
                  value={tfToken}
                  onChange={(e) => setTfToken(inputValue(e))}
                  autoComplete="one-time-code"
                  required
                />
              </Box>
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
            </FormArea>
          )}
        </Modal>
      )}
    </>
  )
}
