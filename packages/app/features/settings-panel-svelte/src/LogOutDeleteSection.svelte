<!--
  LogOutDeleteSection: bottom actions — Log out + Delete account.

  Owns the delete-account modal internally (the trigger lives in the same
  section so the modal lives here too). Reads `onClose` from the
  `SettingsContainer` context to dismiss the panel after either action and
  navigates to `/login`.
-->
<script lang="ts">
  import { get } from 'svelte/store'

  import type { UserProfile } from '@molecule/app-auth'
  import { serverErrorMessage } from '@molecule/app-http'
  import { useAuth, useHttpClient, useRouter, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Alert, Button, Input, Modal } from '@molecule/app-ui-svelte'

  import { useSettingsPanelContext } from './context.js'

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const { user, logout } = useAuth<UserProfile>()
  const http = useHttpClient()
  const { onClose } = useSettingsPanelContext()

  let showModal = $state(false)
  let password = $state('')
  let loading = $state(false)
  let error = $state('')

  const handleLogout = async (): Promise<void> => {
    await logout()
    onClose()
    navigate('/login')
  }

  const handleDelete = async (e: { preventDefault: () => void }): Promise<void> => {
    e.preventDefault()
    loading = true
    error = ''
    try {
      await http.delete(`/api/users/${get(user)?.id}`, { data: { password } })
      await logout()
      onClose()
      navigate('/login')
    } catch (err) {
      error =
        serverErrorMessage(err) ??
        t('settings.failedToDeleteAccount', undefined, {
          defaultValue: 'Failed to delete account.',
        })
    } finally {
      loading = false
    }
  }
</script>

<section class={cm.stack(3)}>
  <Button color="error" fullWidth onClick={handleLogout} data-mol-id="user-menu-logout">
    {t('settings.logOut', undefined, { defaultValue: 'Sign out' })}
  </Button>
  <Button
    variant="ghost"
    fullWidth
    onClick={() => (showModal = true)}
    data-mol-id="user-menu-delete-account"
  >
    {t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
  </Button>
</section>

<Modal
  open={showModal}
  onClose={() => (showModal = false)}
  title={t('settings.deleteAccountModal.title', undefined, {
    defaultValue: 'Delete Account',
  })}
>
  <p class={cm.cn(cm.textSize('sm'), cm.textMuted, cm.sp('mb', 4))}>
    {t('settings.deleteAccountModal.warning', undefined, {
      defaultValue: 'This action cannot be undone. Please enter your password to confirm.',
    })}
  </p>
  {#if error}
    <Alert status="error" className={cm.sp('mb', 4)}>
      {error}
    </Alert>
  {/if}
  <form onsubmit={handleDelete} class={cm.stack(4)}>
    <div>
      <label for="delete-pw" class={cm.formLabel}>
        {t('settings.deleteAccountModal.password', undefined, { defaultValue: 'Password' })}
      </label>
      <Input
        id="delete-pw"
        type="password"
        value={password}
        onChange={(e) => (password = (e.target as HTMLInputElement).value)}
        required
      />
    </div>
    <Button type="submit" color="error" fullWidth {loading}>
      {loading
        ? t('settings.deleteAccountModal.deleting', undefined, {
            defaultValue: 'Deleting...',
          })
        : t('settings.deleteAccount', undefined, { defaultValue: 'Delete account' })}
    </Button>
  </form>
</Modal>
