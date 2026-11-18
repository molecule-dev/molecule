/**
 * Vue authentication section: the change-password modal and the TOTP
 * two-factor enrollment flow.
 *
 * Vue counterpart of `@molecule/app-settings-panel-react`'s `AuthSection` —
 * the same DOM, callbacks and service calls.
 *
 * @module
 */

import { defineComponent, h, onMounted, onUnmounted, type Ref, ref, type VNodeChild } from 'vue'

import type { UserProfile } from '@molecule/app-auth'
import { serverErrorMessage } from '@molecule/app-http'
import { getClassMap } from '@molecule/app-ui'
import { Alert, Button, Flex, Input, Modal } from '@molecule/app-ui-vue'
import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-vue'

/** The enrollment payload `POST /users/:id/verify-two-factor` answers with. */
export interface TwoFactorSetup {
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
 *
 * @returns The authentication section component.
 */
export const AuthSection = defineComponent({
  name: 'AuthSection',
  setup() {
    const cm = getClassMap()
    const { t } = useTranslation()
    const { user } = useAuth<UserProfile>()
    const http = useHttpClient()
    const { status, error, changePassword, reset } = useChangePassword()

    const showModal: Ref<boolean> = ref(false)
    const currentPassword: Ref<string> = ref('')
    const newPassword: Ref<string> = ref('')

    const twoFactorEnabled: Ref<boolean> = ref(false)
    const tfModal: Ref<null | 'enable' | 'disable'> = ref(null)
    const tfSetup: Ref<TwoFactorSetup | null> = ref(null)
    const tfToken: Ref<string> = ref('')
    const tfLoading: Ref<boolean> = ref(false)
    const tfError: Ref<string> = ref('')

    // Read the persisted 2FA status from /users/me on mount.
    let cancelled = false
    onMounted(() => {
      http
        .get<{ props?: { twoFactorEnabled?: boolean }; twoFactorEnabled?: boolean }>(
          '/api/users/me',
        )
        .then((res) => {
          if (cancelled) return
          const body = (res as { data?: Record<string, unknown> }).data ?? res
          const u = ((body as { props?: Record<string, unknown> }).props ?? body) as {
            twoFactorEnabled?: boolean
          }
          twoFactorEnabled.value = Boolean(u?.twoFactorEnabled)
        })
        .catch((_error) => {
          // status read is best-effort; defaults to disabled
        })
    })
    onUnmounted(() => {
      cancelled = true
    })

    /** Resets the two-factor modal state. */
    const closeTf = (): void => {
      tfModal.value = null
      tfSetup.value = null
      tfToken.value = ''
      tfError.value = ''
    }

    /** Asks the server for a QR seed and opens the enable flow. */
    const startEnable = async (): Promise<void> => {
      tfError.value = ''
      tfLoading.value = true
      tfModal.value = 'enable'
      try {
        const res = await http.post<TwoFactorSetup>(
          `/api/users/${user.value?.id}/verify-two-factor`,
          {
            action: 'setup',
          },
        )
        const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
        tfSetup.value = data
      } catch (err) {
        tfError.value =
          serverErrorMessage(err) ??
          t('settings.twoFactorUnavailable', undefined, {
            defaultValue: 'Two-factor authentication is not available for this app.',
          })
      } finally {
        tfLoading.value = false
      }
    }

    /**
     * Submits the entered code for the chosen action and closes the modal.
     *
     * @param action - `'enable'` turns two-factor on, `'disable'` off.
     */
    const submitTf = async (action: 'enable' | 'disable'): Promise<void> => {
      tfError.value = ''
      tfLoading.value = true
      try {
        await http.post(`/api/users/${user.value?.id}/verify-two-factor`, {
          action,
          token: tfToken.value,
        })
        twoFactorEnabled.value = action === 'enable'
        closeTf()
      } catch (err) {
        tfError.value =
          serverErrorMessage(err) ??
          t('settings.twoFactorInvalidCode', undefined, { defaultValue: 'Invalid code' })
      } finally {
        tfLoading.value = false
      }
    }

    /**
     * Submits the change-password form; the hook's error state holds failures.
     *
     * @param event - The native form submit event.
     */
    const handleChangePassword = async (event: Event): Promise<void> => {
      event.preventDefault()
      try {
        await changePassword(currentPassword.value, newPassword.value)
        showModal.value = false
        currentPassword.value = ''
        newPassword.value = ''
        reset()
      } catch (_error) {
        // Error tracked in hook state — useChangePassword surfaces it via `error`.
      }
    }

    return (): VNodeChild => {
      // OAuth users skip this section entirely.
      if (user.value?.oauthServer) return null

      const children: VNodeChild[] = [
        h('section', [
          h('h3', { class: cm.cn(cm.sectionHeading, cm.sp('mb', 3)) }, [
            t('settings.authentication', undefined, { defaultValue: 'Authentication' }),
          ]),
          h('div', { class: cm.stack(3) }, [
            h(
              Button,
              { variant: 'outline', size: 'sm', onClick: () => (showModal.value = true) },
              () => [t('settings.changePassword', undefined, { defaultValue: 'Change password' })],
            ),
            h(Flex, { align: 'center', justify: 'between' }, () => [
              h('span', { class: cm.textSize('sm') }, [
                t('settings.twoFactor', undefined, {
                  defaultValue: 'Two-factor authentication',
                }),
                twoFactorEnabled.value
                  ? h('span', { class: cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2)) }, [
                      t('settings.twoFactorOn', undefined, { defaultValue: 'On' }),
                    ])
                  : null,
              ]),
              twoFactorEnabled.value
                ? h(
                    Button,
                    {
                      variant: 'outline',
                      size: 'sm',
                      onClick: () => {
                        tfError.value = ''
                        tfToken.value = ''
                        tfModal.value = 'disable'
                      },
                      'data-mol-id': 'two-factor-disable',
                    },
                    () => [t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' })],
                  )
                : h(
                    Button,
                    {
                      variant: 'outline',
                      size: 'sm',
                      onClick: () => void startEnable(),
                      'data-mol-id': 'two-factor-enable',
                    },
                    () => [t('settings.twoFactorEnable', undefined, { defaultValue: 'Enable' })],
                  ),
            ]),
          ]),
        ]),
        h(
          Modal,
          {
            open: showModal.value,
            onClose: () => {
              showModal.value = false
              reset()
            },
            title: t('settings.changePasswordModal.title', undefined, {
              defaultValue: 'Change Password',
            }),
          },
          {
            default: () => [
              error.value
                ? h(Alert, { status: 'error', className: cm.sp('mb', 4) }, () => [
                    error.value?.message ||
                      t('settings.changePasswordModal.error', undefined, {
                        defaultValue: 'Failed to change password.',
                      }),
                  ])
                : null,
              h('form', { onSubmit: handleChangePassword, class: cm.stack(4) }, [
                h('div', [
                  h(
                    'label',
                    { for: 'current-pw', class: cm.formLabel },
                    t('settings.changePasswordModal.currentPassword', undefined, {
                      defaultValue: 'Current Password',
                    }),
                  ),
                  h(Input, {
                    id: 'current-pw',
                    type: 'password',
                    value: currentPassword.value,
                    onChange: (e: Event) =>
                      (currentPassword.value = (e.target as HTMLInputElement).value),
                    autoComplete: 'current-password',
                    required: true,
                  }),
                ]),
                h('div', [
                  h(
                    'label',
                    { for: 'new-pw', class: cm.formLabel },
                    t('settings.changePasswordModal.newPassword', undefined, {
                      defaultValue: 'New Password',
                    }),
                  ),
                  h(Input, {
                    id: 'new-pw',
                    type: 'password',
                    value: newPassword.value,
                    onChange: (e: Event) =>
                      (newPassword.value = (e.target as HTMLInputElement).value),
                    autoComplete: 'new-password',
                    required: true,
                  }),
                ]),
                h(
                  Button,
                  { type: 'submit', fullWidth: true, loading: status.value === 'pending' },
                  () => [
                    status.value === 'pending'
                      ? t('settings.changePasswordModal.changing', undefined, {
                          defaultValue: 'Changing...',
                        })
                      : t('settings.changePassword', undefined, {
                          defaultValue: 'Change password',
                        }),
                  ],
                ),
              ]),
            ],
          },
        ),
        h(
          Modal,
          {
            open: tfModal.value !== null,
            onClose: closeTf,
            title:
              tfModal.value === 'disable'
                ? t('settings.twoFactorDisableTitle', undefined, {
                    defaultValue: 'Disable two-factor authentication',
                  })
                : t('settings.twoFactorEnableTitle', undefined, {
                    defaultValue: 'Enable two-factor authentication',
                  }),
          },
          {
            default: () => [
              tfError.value
                ? h(Alert, { status: 'error', className: cm.sp('mb', 4) }, () => [tfError.value])
                : null,
              tfModal.value === 'enable' && tfSetup.value?.QRImageUrl
                ? h('div', { class: cm.cn(cm.stack(3), cm.sp('mb', 4)) }, [
                    h('p', { class: cm.cn(cm.textSize('sm'), cm.textMuted) }, [
                      t('settings.twoFactorScan', undefined, {
                        defaultValue:
                          'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                      }),
                    ]),
                    h('img', {
                      src: tfSetup.value?.QRImageUrl,
                      alt: t('settings.twoFactorQrAlt', undefined, {
                        defaultValue: 'Two-factor QR code',
                      }),
                      class: cm.cn(cm.mxAuto, cm.maxW('xs')),
                    }),
                    tfSetup.value?.secret
                      ? h(
                          'p',
                          {
                            class: cm.cn(
                              cm.textSize('xs'),
                              cm.textSubtle,
                              cm.settingsPanelTwoFactorSecret,
                            ),
                          },
                          [tfSetup.value.secret],
                        )
                      : null,
                  ])
                : null,
              tfModal.value === 'disable' || tfSetup.value
                ? h(
                    'form',
                    {
                      onSubmit: (e: Event) => {
                        e.preventDefault()
                        void submitTf(tfModal.value === 'disable' ? 'disable' : 'enable')
                      },
                      class: cm.stack(4),
                    },
                    [
                      h('div', [
                        h(
                          'label',
                          { for: 'tf-token', class: cm.formLabel },
                          t('settings.twoFactorCode', undefined, {
                            defaultValue: 'Authentication code',
                          }),
                        ),
                        h(Input, {
                          id: 'tf-token',
                          type: 'text',
                          value: tfToken.value,
                          onChange: (e: Event) =>
                            (tfToken.value = (e.target as HTMLInputElement).value),
                          autoComplete: 'one-time-code',
                          required: true,
                        }),
                      ]),
                      h(
                        Button,
                        {
                          type: 'submit',
                          color: tfModal.value === 'disable' ? 'error' : undefined,
                          fullWidth: true,
                          loading: tfLoading.value,
                        },
                        () => [
                          tfModal.value === 'disable'
                            ? t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' })
                            : t('settings.twoFactorVerify', undefined, {
                                defaultValue: 'Verify & enable',
                              }),
                        ],
                      ),
                    ],
                  )
                : null,
            ],
          },
        ),
      ]
      return children
    }
  },
})
