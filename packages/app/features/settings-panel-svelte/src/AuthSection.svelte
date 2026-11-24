<!--
  AuthSection: change password (modal) + two-factor (TOTP) setup.

  Two-factor uses the real enrollment flow against the user resource's
  `POST /users/:id/verify-two-factor` endpoint (`@molecule/api-two-factor`):
  - Enable → `{action:'setup'}` returns a QR code + secret to scan into an
    authenticator app → user enters the 6-digit code → `{action:'enable', token}`.
  - Disable → user enters a current code → `{action:'disable', token}`.
  The current status is read from `/users/me`.

  Auto-hides for OAuth-only users (`user.oauthServer` truthy) since password
  / 2FA wouldn't apply. Pass `twoFactor={false}` when the app's API has no
  two-factor provider: it then serves no `verify-two-factor` route, so the
  section shows only the password change and reads no 2FA status.
-->
<script lang="ts">
  import type { UserProfile } from '@molecule/app-auth'
  import { serverErrorMessage } from '@molecule/app-http'
  import { useAuth, useChangePassword, useHttpClient, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Alert, Button, Flex, Input, Modal } from '@molecule/app-ui-svelte'

  import type { AuthSectionProps, TwoFactorSetup } from './types.js'

  const { twoFactor = true }: AuthSectionProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()
  const { status, error, changePassword, reset } = useChangePassword()

  let showModal = $state(false)
  let currentPassword = $state('')
  let newPassword = $state('')

  const userId = $derived($user?.id)
  let twoFactorEnabled = $state(false)
  let tfModal = $state<null | 'enable' | 'disable'>(null)
  let tfSetup = $state<TwoFactorSetup | null>(null)
  let tfToken = $state('')
  let tfLoading = $state(false)
  let tfError = $state('')

  // Read the persisted 2FA status from /users/me on mount. The status read
  // runs even for OAuth-only users, like React's effect under the null return.
  $effect(() => {
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
        twoFactorEnabled = Boolean(u?.twoFactorEnabled)
      })
      .catch((_error) => {
        /* status read is best-effort; defaults to disabled */
      })
    return () => {
      cancelled = true
    }
  })

  const closeTf = (): void => {
    tfModal = null
    tfSetup = null
    tfToken = ''
    tfError = ''
  }

  const startEnable = async (): Promise<void> => {
    tfError = ''
    tfLoading = true
    tfModal = 'enable'
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${userId}/verify-two-factor`, {
        action: 'setup',
      })
      const data = ((res as { data?: TwoFactorSetup }).data ?? res) as TwoFactorSetup
      tfSetup = data
    } catch (err) {
      tfError =
        serverErrorMessage(err) ??
        t('settings.twoFactorUnavailable', undefined, {
          defaultValue: 'Two-factor authentication is not available for this app.',
        })
    } finally {
      tfLoading = false
    }
  }

  const submitTf = async (action: 'enable' | 'disable'): Promise<void> => {
    tfError = ''
    tfLoading = true
    try {
      await http.post(`/api/users/${userId}/verify-two-factor`, { action, token: tfToken })
      twoFactorEnabled = action === 'enable'
      closeTf()
    } catch (err) {
      tfError =
        serverErrorMessage(err) ??
        t('settings.twoFactorInvalidCode', undefined, { defaultValue: 'Invalid code' })
    } finally {
      tfLoading = false
    }
  }

  const handleChangePassword = async (e: { preventDefault: () => void }): Promise<void> => {
    e.preventDefault()
    try {
      await changePassword(currentPassword, newPassword)
      showModal = false
      currentPassword = ''
      newPassword = ''
      reset()
    } catch (_error) {
      // Error tracked in hook state — useChangePassword surfaces it via `error`.
    }
  }
</script>

{#if !$user?.oauthServer}
  <section>
    <h3 class={cm.cn(cm.sectionHeading, cm.sp('mb', 3))}>
      {t('settings.authentication', undefined, { defaultValue: 'Authentication' })}
    </h3>
    <div class={cm.stack(3)}>
      <Button variant="outline" size="sm" onClick={() => (showModal = true)}>
        {t('settings.changePassword', undefined, { defaultValue: 'Change password' })}
      </Button>
      {#if twoFactor}
        <Flex align="center" justify="between">
          <span class={cm.textSize('sm')}
            >{t('settings.twoFactor', undefined, {
              defaultValue: 'Two-factor authentication',
            })}{#if twoFactorEnabled}<span
                class={cm.cn(cm.textSize('xs'), cm.textSubtle, cm.sp('ml', 2))}
              >
                {t('settings.twoFactorOn', undefined, { defaultValue: 'On' })}
              </span>{/if}</span
          >
          {#if twoFactorEnabled}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                tfError = ''
                tfToken = ''
                tfModal = 'disable'
              }}
              data-mol-id="two-factor-disable"
            >
              {t('settings.twoFactorDisable', undefined, { defaultValue: 'Disable' })}
            </Button>
          {:else}
            <Button
              variant="outline"
              size="sm"
              onClick={startEnable}
              data-mol-id="two-factor-enable"
            >
              {t('settings.twoFactorEnable', undefined, { defaultValue: 'Enable' })}
            </Button>
          {/if}
        </Flex>
      {/if}
    </div>
  </section>

  <Modal
    open={showModal}
    onClose={() => {
      showModal = false
      reset()
    }}
    title={t('settings.changePasswordModal.title', undefined, {
      defaultValue: 'Change Password',
    })}
  >
    {#if $error}
      <Alert status="error" className={cm.sp('mb', 4)}>
        {$error.message ||
          t('settings.changePasswordModal.error', undefined, {
            defaultValue: 'Failed to change password.',
          })}
      </Alert>
    {/if}
    <form onsubmit={handleChangePassword} class={cm.stack(4)}>
      <div>
        <label for="current-pw" class={cm.formLabel}>
          {t('settings.changePasswordModal.currentPassword', undefined, {
            defaultValue: 'Current Password',
          })}
        </label>
        <Input
          id="current-pw"
          type="password"
          value={currentPassword}
          onChange={(e) => (currentPassword = (e.target as HTMLInputElement).value)}
          autoComplete="current-password"
          required
        />
      </div>
      <div>
        <label for="new-pw" class={cm.formLabel}>
          {t('settings.changePasswordModal.newPassword', undefined, {
            defaultValue: 'New Password',
          })}
        </label>
        <Input
          id="new-pw"
          type="password"
          value={newPassword}
          onChange={(e) => (newPassword = (e.target as HTMLInputElement).value)}
          autoComplete="new-password"
          required
        />
      </div>
      <Button type="submit" fullWidth loading={$status === 'pending'}>
        {$status === 'pending'
          ? t('settings.changePasswordModal.changing', undefined, {
              defaultValue: 'Changing...',
            })
          : t('settings.changePassword', undefined, { defaultValue: 'Change password' })}
      </Button>
    </form>
  </Modal>

  {#if twoFactor}
    <Modal
      open={tfModal !== null}
      onClose={closeTf}
      title={tfModal === 'disable'
        ? t('settings.twoFactorDisableTitle', undefined, {
            defaultValue: 'Disable two-factor authentication',
          })
        : t('settings.twoFactorEnableTitle', undefined, {
            defaultValue: 'Enable two-factor authentication',
          })}
    >
      {#if tfError}
        <Alert status="error" className={cm.sp('mb', 4)}>
          {tfError}
        </Alert>
      {/if}
      {#if tfModal === 'enable' && tfSetup?.QRImageUrl}
        <div class={cm.cn(cm.stack(3), cm.sp('mb', 4))}>
          <p class={cm.cn(cm.textSize('sm'), cm.textMuted)}>
            {t('settings.twoFactorScan', undefined, {
              defaultValue:
                'Scan this QR code with your authenticator app, then enter the 6-digit code.',
            })}
          </p>
          <img
            src={tfSetup.QRImageUrl}
            alt={t('settings.twoFactorQrAlt', undefined, { defaultValue: 'Two-factor QR code' })}
            class={cm.cn(cm.mxAuto, cm.maxW('xs'))}
          />
          {#if tfSetup.secret}
            <p class={cm.cn(cm.textSize('xs'), cm.textSubtle, cm.settingsPanelTwoFactorSecret)}>
              {tfSetup.secret}
            </p>
          {/if}
        </div>
      {/if}
      {#if tfModal === 'disable' || tfSetup}
        <form
          onsubmit={(e) => {
            e.preventDefault()
            void submitTf(tfModal === 'disable' ? 'disable' : 'enable')
          }}
          class={cm.stack(4)}
        >
          <div>
            <label for="tf-token" class={cm.formLabel}>
              {t('settings.twoFactorCode', undefined, { defaultValue: 'Authentication code' })}
            </label>
            <Input
              id="tf-token"
              type="text"
              value={tfToken}
              onChange={(e) => (tfToken = (e.target as HTMLInputElement).value)}
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
      {/if}
    </Modal>
  {/if}
{/if}
