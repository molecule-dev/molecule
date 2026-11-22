/** Loaded form fields use the bonded form controller: edit setters mark dirty; fill setters preserve edits. */
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'

import { track } from '@molecule/app-analytics'
import type { UserProfile } from '@molecule/app-auth'
import {
  useAuth,
  useChangePassword,
  useForm,
  useHttpClient,
  useTranslation,
} from '@molecule/app-react'
import { NotificationsSection } from '@molecule/app-settings-panel-react'
import { getClassMap } from '@molecule/app-ui'
import { LanguagePicker, ThemeToggle } from '@molecule/app-ui-react'

import { unwrapList, unwrapSingle } from '../lib/unwrap.js'

const SECTIONS = ['account', 'billing', 'team', 'integrations'] as const
type Section = (typeof SECTIONS)[number]

interface TeamMember {
  id: string
  email?: string | null
  role?: string | null
}

interface Integration {
  id: string
  name: string
  status: 'connected' | 'not_connected'
}

interface AccountInfo {
  display_name?: string | null
  email?: string | null
  handle?: string | null
}

interface AccountForm {
  display_name: string
  handle: string
  email: string
}

interface BillingSummary {
  plan_name?: string | null
  monthly_cents?: number | null
  requests_used?: number | null
  requests_quota?: number | null
}

interface Device {
  id: string
  name?: string | null
  platform?: string | null
  lastSeen?: string | null
  /** `true` for the device making the current request (the API marks it). */
  isCurrent?: boolean
}

interface TwoFactorSetup {
  QRImageUrl?: string
  keyUrl?: string
  secret?: string
}

export function Settings() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const http = useHttpClient()
  const navigate = useNavigate()
  const { user, logout } = useAuth<UserProfile>()
  const [section, setSection] = useState<Section>('account')
  // Counter ensures every section click produces an observable DOM change
  // (the active button gets a refreshed `data-section-clicks` attribute)
  // even when the user re-clicks the already-active section.
  const [sectionClicks, setSectionClicks] = useState(0)

  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [accountLoading, setAccountLoading] = useState(true)
  const [accountForm, setAccountForm, fillAccountForm] = useForm<AccountForm>({
    defaultValues: {
      display_name: '',
      handle: '',
      email: '',
    } as AccountForm,
    resetOptions: { keepDirtyValues: true },
    resetKey: JSON.stringify(user && typeof user === 'object' && 'id' in user ? user.id : null),
  }).asState()
  const [accountSaving, setAccountSaving] = useState(false)
  const [accountSavedAt, setAccountSavedAt] = useState<number | null>(null)
  const [accountError, setAccountError] = useState<string | null>(null)
  const [billing, setBilling] = useState<BillingSummary | null>(null)
  const [billingLoading, setBillingLoading] = useState(true)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [integrationsLoading, setIntegrationsLoading] = useState(true)

  // Change password (C4) — wired to the auth client's changePassword endpoint.
  const {
    status: pwStatus,
    error: pwError,
    changePassword,
    reset: resetChangePassword,
  } = useChangePassword()
  const [showPwForm, setShowPwForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')

  // Devices (C7) — lists the user's registered devices (GET /api/devices) and
  // lets the user revoke (sign out) any device other than the current one.
  const [devices, setDevices] = useState<Device[]>([])
  const [devicesLoading, setDevicesLoading] = useState(true)
  const [confirmingDeviceId, setConfirmingDeviceId] = useState<string | null>(null)
  const [revokingDeviceId, setRevokingDeviceId] = useState<string | null>(null)

  // Two-factor (TOTP) — real enrollment flow against
  // POST /api/users/:id/verify-two-factor (@molecule/api-two-factor):
  // enable → setup (QR + secret) → verify code; disable → verify code.
  // Current status is read from GET /api/users/me.
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [tfModal, setTfModal] = useState<null | 'enable' | 'disable'>(null)
  const [tfSetup, setTfSetup] = useState<TwoFactorSetup | null>(null)
  const [tfToken, setTfToken] = useState('')
  const [tfLoading, setTfLoading] = useState(false)
  const [tfError, setTfError] = useState<string | null>(null)

  // Delete account (C10) — password-confirmed DELETE /api/users/:id.
  const [showDelete, setShowDelete] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setAccountLoading(true)
    http
      .get('/api/profile')
      .then((res) => {
        if (cancelled) return
        const data = unwrapSingle<AccountInfo>(res)
        setAccount(data)
        fillAccountForm({
          display_name: data?.display_name ?? '',
          handle: data?.handle ?? '',
          email: data?.email ?? '',
        })
      })
      .catch(() => {
        if (!cancelled) setAccount(null)
      })
      .finally(() => {
        if (!cancelled) setAccountLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http, fillAccountForm])

  function handleSaveAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (accountSaving) return
    setAccountSaving(true)
    setAccountError(null)
    setAccountSavedAt(null)
    const body = {
      display_name: accountForm.display_name.trim() || undefined,
      handle: accountForm.handle.trim() ? accountForm.handle.trim() : null,
    }
    // Email lives on the user resource (not the profile extension), so it
    // PATCHes /api/users/:id. Only send it when it actually changed.
    const nextEmail = accountForm.email.trim()
    const emailChanged =
      Boolean(user?.id) && nextEmail !== '' && nextEmail !== (account?.email ?? '')
    Promise.all([
      http.patch<AccountInfo>('/api/profile', body),
      emailChanged
        ? http.patch(`/api/users/${user?.id}`, { email: nextEmail })
        : Promise.resolve(null),
    ])
      .then(([res]) => {
        const updated = unwrapSingle<AccountInfo>(res)
        // The profile PATCH echoes the pre-change email, so prefer the value
        // we just persisted via the user resource when it changed.
        const savedEmail = emailChanged ? nextEmail : (updated?.email ?? account?.email ?? '')
        if (updated) {
          setAccount({ ...updated, email: savedEmail })
          setAccountForm({
            display_name: updated.display_name ?? '',
            handle: updated.handle ?? '',
            email: savedEmail,
          })
        }
        setAccountSavedAt(Date.now())
        track({
          name: 'settings.profile_updated',
          properties: { ...(user?.id ? { id: user.id } : {}), email_changed: emailChanged },
        })
      })
      .catch(() => {
        setAccountError(
          t('settings.account.saveError', {}, { defaultValue: 'Could not save your changes.' }),
        )
      })
      .finally(() => setAccountSaving(false))
  }

  useEffect(() => {
    let cancelled = false
    setBillingLoading(true)
    http
      .get('/api/billing')
      .then((res) => {
        if (!cancelled) setBilling(unwrapSingle<BillingSummary>(res))
      })
      .catch(() => {
        if (!cancelled) setBilling(null)
      })
      .finally(() => {
        if (!cancelled) setBillingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    let cancelled = false
    setMembersLoading(true)
    http
      .get('/api/team_members')
      .then((res) => {
        if (!cancelled) setMembers(unwrapList<TeamMember>(res))
      })
      .catch(() => {
        if (!cancelled) setMembers([])
      })
      .finally(() => {
        if (!cancelled) setMembersLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  useEffect(() => {
    let cancelled = false
    setIntegrationsLoading(true)
    http
      .get('/api/integrations')
      .then((res) => {
        if (!cancelled) setIntegrations(unwrapList<Integration>(res))
      })
      .catch(() => {
        if (!cancelled) setIntegrations([])
      })
      .finally(() => {
        if (!cancelled) setIntegrationsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [http])

  const loadDevices = useCallback(() => {
    setDevicesLoading(true)
    return http
      .get('/api/devices')
      .then((res) => {
        setDevices(unwrapList<Device>(res))
      })
      .catch(() => {
        setDevices([])
      })
      .finally(() => {
        setDevicesLoading(false)
      })
  }, [http])

  useEffect(() => {
    void loadDevices()
  }, [loadDevices])

  // Read the persisted 2FA status from /api/users/me on mount.
  useEffect(() => {
    let cancelled = false
    http
      .get('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const me = unwrapSingle<{
          twoFactorEnabled?: boolean
          props?: { twoFactorEnabled?: boolean }
        }>(res)
        setTwoFactorEnabled(Boolean(me?.props?.twoFactorEnabled ?? me?.twoFactorEnabled))
      })
      .catch(() => {
        /* status read is best-effort; defaults to disabled */
      })
    return () => {
      cancelled = true
    }
  }, [http])

  async function handleRevokeDevice(id: string) {
    setRevokingDeviceId(id)
    try {
      await http.delete(`/api/devices/${id}`)
      setConfirmingDeviceId(null)
      await loadDevices()
    } catch (_error) {
      // Best-effort — keep the row so the user can retry the revoke.
    } finally {
      setRevokingDeviceId(null)
    }
  }

  function closeTwoFactor() {
    setTfModal(null)
    setTfSetup(null)
    setTfToken('')
    setTfError(null)
  }

  async function startEnableTwoFactor() {
    setTfError(null)
    setTfSetup(null)
    setTfLoading(true)
    setTfModal('enable')
    try {
      const res = await http.post<TwoFactorSetup>(`/api/users/${user?.id}/verify-two-factor`, {
        action: 'setup',
      })
      setTfSetup(unwrapSingle<TwoFactorSetup>(res))
    } catch (_error) {
      setTfError(
        t(
          'settings.twoFactorUnavailable',
          {},
          { defaultValue: 'Two-factor authentication is not available for this app.' },
        ),
      )
    } finally {
      setTfLoading(false)
    }
  }

  async function submitTwoFactor(action: 'enable' | 'disable') {
    setTfError(null)
    setTfLoading(true)
    try {
      await http.post(`/api/users/${user?.id}/verify-two-factor`, { action, token: tfToken })
      setTwoFactorEnabled(action === 'enable')
      closeTwoFactor()
    } catch (_error) {
      setTfError(t('settings.twoFactorInvalidCode', {}, { defaultValue: 'Invalid code' }))
    } finally {
      setTfLoading(false)
    }
  }

  async function handleChangePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pwStatus === 'pending') return
    try {
      await changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setShowPwForm(false)
    } catch (_error) {
      // Error is surfaced via `pwError` from the useChangePassword hook state;
      // keep the form open so the user can correct and retry.
    }
  }

  async function handleDeleteAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (deleteLoading) return
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      await http.delete(`/api/users/${user?.id}`, { data: { password: deletePassword } })
      await logout()
      navigate('/login')
    } catch (_error) {
      setDeleteError(
        t(
          'settings.deleteAccount.error',
          {},
          { defaultValue: 'Could not delete your account. Check your password and try again.' },
        ),
      )
    } finally {
      setDeleteLoading(false)
    }
  }

  function handleRemoveMember(id: string) {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    http.delete(`/api/team_members/${id}`).catch(() => {
      /* optimistic */
    })
    track({ name: 'team_member.removed', properties: { id } })
  }

  function handleToggleIntegration(id: string) {
    setIntegrations((prev) =>
      prev.map((i) =>
        i.id === id
          ? { ...i, status: i.status === 'connected' ? 'not_connected' : 'connected' }
          : i,
      ),
    )
    http.post(`/api/integrations/${id}/toggle`, {}).catch(() => {
      /* optimistic */
    })
  }

  const usagePct =
    billing && billing.requests_used != null && billing.requests_quota
      ? Math.min(100, Math.round((billing.requests_used / billing.requests_quota) * 100))
      : 0

  return (
    <div className={cm.cn(cm.sp('px', 8), cm.sp('py', 8))}>
      <header className={cm.sp('mb', 6)}>
        <p
          className={cm.cn(
            cm.textSize('xs'),
            cm.fontWeight('bold'),
            cm.sp('mb', 2),
            'uppercase tracking-widest text-primary font-mono',
          )}
        >
          {t('settings.eyebrow', {}, { defaultValue: 'CONFIG' })}
        </p>
        <h1 className={cm.cn(cm.textSize('3xl'), cm.fontWeight('bold'), 'tracking-tight')}>
          {t('nav.settings', {}, { defaultValue: 'Settings' })}
        </h1>
        <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant', cm.sp('mt', 1))}>
          {t(
            'settings.subheading',
            {},
            { defaultValue: 'Account, billing, team access, and integrations.' },
          )}
        </p>
      </header>
      <div className={cm.grid({ cols: 12, gap: 'lg' })}>
        <aside className={cm.cn('col-span-12 md:col-span-3')}>
          <nav
            className={cm.cn('space-y-1')}
            aria-label={t('nav.settingsSections', {}, { defaultValue: 'Settings sections' })}
          >
            {SECTIONS.map((s) => {
              const isActive = section === s
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setSection(s)
                    setSectionClicks((c) => c + 1)
                  }}
                  className={cm.cn(
                    cm.sp('px', 3),
                    cm.sp('py', 2),
                    cm.textSize('sm'),
                    cm.fontWeight('medium'),
                    'block w-full text-left rounded-md',
                    isActive
                      ? cm.cn('bg-primary-container', cm.textPrimary)
                      : cm.cn(
                          'text-on-surface-variant',
                          'hover:bg-surface-container hover:text-on-surface',
                        ),
                  )}
                  aria-current={isActive ? 'page' : undefined}
                  data-section-clicks={sectionClicks}
                >
                  {t(
                    `settings.section.${s}`,
                    {},
                    { defaultValue: s.charAt(0).toUpperCase() + s.slice(1) },
                  )}
                </button>
              )
            })}
          </nav>
        </aside>

        <main className={cm.cn('col-span-12 md:col-span-9 space-y-4')}>
          <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
            <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
              {t('settings.language.title', {}, { defaultValue: 'Language' })}
            </h2>
            <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
              {t(
                'common.chooseTheLanguage',
                {},
                { defaultValue: 'Choose the language used throughout the app.' },
              )}
            </p>
            <LanguagePicker />
          </section>

          <section className={cm.cn(cm.sp('p', 8), 'bg-surface-container-low rounded-xl')}>
            <div className={cm.sp('mb', 6)}>
              <h3 className={cm.cn(cm.fontWeight('bold'), cm.textSize('lg'), 'text-on-surface')}>
                {t('nav.appearance', {}, { defaultValue: 'Appearance' })}
              </h3>
              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                {t(
                  'common.toggleLightDark',
                  {},
                  { defaultValue: 'Toggle between light and dark mode.' },
                )}
              </p>
            </div>
            <ThemeToggle />
          </section>
          {section === 'account' && (
            <>
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.account', {}, { defaultValue: 'Account' })}
                </h2>
                {accountLoading ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t('settings.account.loading', {}, { defaultValue: 'Loading account…' })}
                  </p>
                ) : (
                  <form onSubmit={handleSaveAccount} className="space-y-4">
                    <label className="block">
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'block',
                          cm.sp('mb', 1),
                        )}
                      >
                        {t('form.displayName', {}, { defaultValue: 'Display name' })}
                      </span>
                      <input
                        name="display_name"
                        type="text"
                        value={accountForm.display_name}
                        onChange={(e) =>
                          setAccountForm((f) => ({ ...f, display_name: e.target.value }))
                        }
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          'w-full border border-outline-variant rounded-md',
                        )}
                      />
                    </label>
                    <label className="block">
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'block',
                          cm.sp('mb', 1),
                        )}
                      >
                        {t('auth.forgotPassword.email', {}, { defaultValue: 'Email' })}
                      </span>
                      <input
                        name="email"
                        type="email"
                        autoComplete="email"
                        value={accountForm.email}
                        onChange={(e) => setAccountForm((f) => ({ ...f, email: e.target.value }))}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          'w-full border border-outline-variant rounded-md',
                        )}
                      />
                    </label>
                    <label className="block">
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'block',
                          cm.sp('mb', 1),
                        )}
                      >
                        {t('settings.account.handle', {}, { defaultValue: 'Public dev handle' })}
                      </span>
                      <input
                        name="handle"
                        type="text"
                        value={accountForm.handle}
                        onChange={(e) => setAccountForm((f) => ({ ...f, handle: e.target.value }))}
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          'w-full border border-outline-variant rounded-md font-mono',
                        )}
                      />
                    </label>
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <button
                        type="submit"
                        disabled={accountSaving}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.fontWeight('semibold'),
                          'bg-primary text-on-primary rounded-md disabled:opacity-50',
                        )}
                      >
                        {accountSaving
                          ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                          : t('common.saveChanges', {}, { defaultValue: 'Save changes' })}
                      </button>
                      {accountSavedAt ? (
                        <span
                          data-account-saved-at={accountSavedAt}
                          className={cm.cn(cm.textSize('sm'), 'text-success')}
                        >
                          {t('common.savedPeriod', {}, { defaultValue: 'Saved.' })}
                        </span>
                      ) : null}
                      {accountError ? (
                        <span className={cm.cn(cm.textSize('sm'), 'text-error')}>
                          {accountError}
                        </span>
                      ) : null}
                    </div>
                  </form>
                )}
              </section>

              <div className={cm.cn(cm.card(), cm.sp('p', 5))}>
                <NotificationsSection />
              </div>

              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.security', {}, { defaultValue: 'Security' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.security.subheading',
                    {},
                    { defaultValue: 'Update the password you use to sign in.' },
                  )}
                </p>
                {showPwForm ? (
                  <form onSubmit={handleChangePassword} className="space-y-4">
                    <label className="block">
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'block',
                          cm.sp('mb', 1),
                        )}
                      >
                        {t(
                          'settings.changePasswordModal.currentPassword',
                          {},
                          { defaultValue: 'Current password' },
                        )}
                      </span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          'w-full border border-outline-variant rounded-md',
                        )}
                      />
                    </label>
                    <label className="block">
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'block',
                          cm.sp('mb', 1),
                        )}
                      >
                        {t(
                          'settings.changePasswordModal.newPassword',
                          {},
                          { defaultValue: 'New password' },
                        )}
                      </span>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          'w-full border border-outline-variant rounded-md',
                        )}
                      />
                    </label>
                    {pwError ? (
                      <p className={cm.cn(cm.textSize('sm'), 'text-error')}>
                        {pwError.message ||
                          t(
                            'settings.changePasswordModal.error',
                            {},
                            { defaultValue: 'Could not change your password.' },
                          )}
                      </p>
                    ) : null}
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <button
                        type="submit"
                        disabled={pwStatus === 'pending'}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.fontWeight('semibold'),
                          'bg-primary text-on-primary rounded-md disabled:opacity-50',
                        )}
                      >
                        {pwStatus === 'pending'
                          ? t(
                              'settings.changePasswordModal.changing',
                              {},
                              { defaultValue: 'Updating…' },
                            )
                          : t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPwForm(false)
                          setCurrentPassword('')
                          setNewPassword('')
                          resetChangePassword()
                        }}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.fontWeight('medium'),
                          'text-on-surface-variant hover:text-on-surface',
                        )}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                    <button
                      type="button"
                      onClick={() => setShowPwForm(true)}
                      className={cm.cn(
                        cm.sp('px', 4),
                        cm.sp('py', 2),
                        cm.fontWeight('semibold'),
                        'border border-outline-variant rounded-md hover:bg-surface-container',
                      )}
                    >
                      {t('settings.changePassword', {}, { defaultValue: 'Change password' })}
                    </button>
                    {pwStatus === 'resolved' ? (
                      <span className={cm.cn(cm.textSize('sm'), 'text-success')}>
                        {t(
                          'settings.changePassword.success',
                          {},
                          { defaultValue: 'Password updated.' },
                        )}
                      </span>
                    ) : null}
                  </div>
                )}

                <div
                  className={cm.cn('border-t border-outline-variant', cm.sp('pt', 4), 'space-y-4')}
                >
                  <div className={cm.flex({ align: 'center', justify: 'between', gap: 'sm' })}>
                    <div>
                      <p className={cm.fontWeight('medium')}>
                        {t('settings.twoFactor', {}, { defaultValue: 'Two-factor authentication' })}
                        {twoFactorEnabled ? (
                          <span
                            className={cm.cn(cm.textSize('xs'), 'text-success', cm.sp('ml', 2))}
                          >
                            {t('settings.twoFactorOn', {}, { defaultValue: 'On' })}
                          </span>
                        ) : null}
                      </p>
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {t(
                          'settings.twoFactor.subheading',
                          {},
                          {
                            defaultValue:
                              'Require a one-time code from an authenticator app when you sign in.',
                          },
                        )}
                      </p>
                    </div>
                    {tfModal === null ? (
                      twoFactorEnabled ? (
                        <button
                          type="button"
                          onClick={() => {
                            setTfError(null)
                            setTfToken('')
                            setTfModal('disable')
                          }}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            cm.fontWeight('semibold'),
                            'border border-outline-variant rounded-md hover:bg-surface-container whitespace-nowrap',
                          )}
                          data-mol-id="two-factor-disable"
                        >
                          {t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startEnableTwoFactor}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            cm.fontWeight('semibold'),
                            'border border-outline-variant rounded-md hover:bg-surface-container whitespace-nowrap',
                          )}
                          data-mol-id="two-factor-enable"
                        >
                          {t('settings.twoFactorEnable', {}, { defaultValue: 'Enable' })}
                        </button>
                      )
                    ) : null}
                  </div>

                  {tfModal === 'enable' && !tfSetup ? (
                    tfError ? (
                      <div className="space-y-3">
                        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{tfError}</p>
                        <button
                          type="button"
                          onClick={closeTwoFactor}
                          className={cm.cn(
                            cm.textSize('sm'),
                            'text-on-surface-variant hover:text-on-surface',
                          )}
                        >
                          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                        </button>
                      </div>
                    ) : (
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {t('common.loadingEllipsis', {}, { defaultValue: 'Loading…' })}
                      </p>
                    )
                  ) : null}

                  {tfModal === 'enable' && tfSetup?.QRImageUrl ? (
                    <div className="space-y-3">
                      <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                        {t(
                          'settings.twoFactorScan',
                          {},
                          {
                            defaultValue:
                              'Scan this QR code with your authenticator app, then enter the 6-digit code.',
                          },
                        )}
                      </p>
                      <img
                        src={tfSetup.QRImageUrl}
                        alt={t(
                          'settings.twoFactorQrAlt',
                          {},
                          { defaultValue: 'Two-factor QR code' },
                        )}
                        className={cm.cn('mx-auto', cm.maxW('xs'))}
                      />
                      {tfSetup.secret ? (
                        <p
                          className={cm.cn(
                            cm.textSize('xs'),
                            'text-on-surface-variant text-center break-all font-mono',
                          )}
                        >
                          {tfSetup.secret}
                        </p>
                      ) : null}
                    </div>
                  ) : null}

                  {tfModal === 'disable' || (tfModal === 'enable' && tfSetup) ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault()
                        void submitTwoFactor(tfModal === 'disable' ? 'disable' : 'enable')
                      }}
                      className="space-y-4"
                    >
                      <label className="block">
                        <span
                          className={cm.cn(
                            cm.textSize('sm'),
                            cm.fontWeight('medium'),
                            'block',
                            cm.sp('mb', 1),
                          )}
                        >
                          {t('settings.twoFactorCode', {}, { defaultValue: 'Authentication code' })}
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          value={tfToken}
                          onChange={(e) => setTfToken(e.target.value)}
                          required
                          className={cm.cn(
                            cm.sp('px', 3),
                            cm.sp('py', 2),
                            'w-full border border-outline-variant rounded-md font-mono',
                          )}
                        />
                      </label>
                      {tfError ? (
                        <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{tfError}</p>
                      ) : null}
                      <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                        <button
                          type="submit"
                          disabled={tfLoading}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            cm.fontWeight('semibold'),
                            'rounded-md disabled:opacity-50',
                            tfModal === 'disable'
                              ? 'bg-error text-on-error'
                              : 'bg-primary text-on-primary',
                          )}
                        >
                          {tfLoading
                            ? t('common.savingEllipsis', {}, { defaultValue: 'Saving…' })
                            : tfModal === 'disable'
                              ? t('settings.twoFactorDisable', {}, { defaultValue: 'Disable' })
                              : t(
                                  'settings.twoFactorVerify',
                                  {},
                                  { defaultValue: 'Verify & enable' },
                                )}
                        </button>
                        <button
                          type="button"
                          onClick={closeTwoFactor}
                          className={cm.cn(
                            cm.sp('px', 4),
                            cm.sp('py', 2),
                            cm.fontWeight('medium'),
                            'text-on-surface-variant hover:text-on-surface',
                          )}
                        >
                          {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                        </button>
                      </div>
                    </form>
                  ) : null}
                </div>
              </section>

              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.devices', {}, { defaultValue: 'Devices' })}
                </h2>
                {devicesLoading ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t('settings.devices.loading', {}, { defaultValue: 'Loading devices…' })}
                  </p>
                ) : devices.length === 0 ? (
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'settings.devices.empty',
                      {},
                      { defaultValue: 'No devices registered yet.' },
                    )}
                  </p>
                ) : (
                  <ul className={cm.cn('space-y-2')}>
                    {devices.map((d) => (
                      <li
                        key={d.id}
                        className={cm.cn(
                          cm.sp('py', 2),
                          'border-b border-outline-variant last:border-b-0',
                        )}
                      >
                        <div className={cm.flex({ align: 'center', justify: 'between' })}>
                          <div>
                            <p className={cm.fontWeight('medium')}>
                              {d.name ||
                                d.platform ||
                                t(
                                  'settings.devices.unknown',
                                  {},
                                  { defaultValue: 'Unknown device' },
                                )}
                              {d.isCurrent ? (
                                <span
                                  className={cm.cn(
                                    cm.textSize('xs'),
                                    'text-on-surface-variant',
                                    cm.sp('ml', 2),
                                  )}
                                >
                                  {t('settings.thisDevice', {}, { defaultValue: 'This device' })}
                                </span>
                              ) : null}
                            </p>
                            {d.platform ? (
                              <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                                {d.platform}
                              </p>
                            ) : null}
                          </div>
                          <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                            {d.lastSeen ? (
                              <span
                                className={cm.cn(
                                  cm.textSize('xs'),
                                  'text-on-surface-variant font-mono',
                                )}
                              >
                                {d.lastSeen}
                              </span>
                            ) : null}
                            {d.isCurrent ? null : confirmingDeviceId === d.id ? (
                              <span className={cm.flex({ align: 'center', gap: 'sm' })}>
                                <button
                                  type="button"
                                  disabled={revokingDeviceId === d.id}
                                  onClick={() => setConfirmingDeviceId(null)}
                                  className={cm.cn(
                                    cm.textSize('sm'),
                                    'text-on-surface-variant hover:text-on-surface disabled:opacity-50',
                                  )}
                                >
                                  {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                                </button>
                                <button
                                  type="button"
                                  disabled={revokingDeviceId === d.id}
                                  onClick={() => handleRevokeDevice(d.id)}
                                  className={cm.cn(
                                    cm.textSize('sm'),
                                    cm.fontWeight('semibold'),
                                    'text-error hover:underline disabled:opacity-50',
                                  )}
                                  data-mol-id="device-revoke-confirm"
                                >
                                  {revokingDeviceId === d.id
                                    ? t(
                                        'settings.devices.signingOut',
                                        {},
                                        { defaultValue: 'Signing out…' },
                                      )
                                    : t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                                </button>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmingDeviceId(d.id)}
                                className={cm.cn(
                                  cm.textSize('sm'),
                                  'text-on-surface-variant hover:text-on-surface',
                                )}
                                data-mol-id="device-revoke"
                              >
                                {t('settings.signOutDevice', {}, { defaultValue: 'Sign out' })}
                              </button>
                            )}
                          </div>
                        </div>
                        {confirmingDeviceId === d.id ? (
                          <p
                            className={cm.cn(
                              cm.textSize('xs'),
                              'text-on-surface-variant',
                              cm.sp('mt', 1),
                            )}
                          >
                            {t(
                              'settings.revokeDeviceWarning',
                              {},
                              {
                                defaultValue:
                                  "This device's access will be revoked shortly. Sign it out?",
                              },
                            )}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section
                className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-4 border border-error/40')}
              >
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'), 'text-error')}>
                  {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.deleteAccount.warning',
                    {},
                    {
                      defaultValue:
                        'Permanently delete your account and all associated data. This cannot be undone.',
                    },
                  )}
                </p>
                {showDelete ? (
                  <form onSubmit={handleDeleteAccount} className="space-y-4">
                    <label className="block">
                      <span
                        className={cm.cn(
                          cm.textSize('sm'),
                          cm.fontWeight('medium'),
                          'block',
                          cm.sp('mb', 1),
                        )}
                      >
                        {t(
                          'settings.deleteAccountModal.password',
                          {},
                          { defaultValue: 'Confirm your password' },
                        )}
                      </span>
                      <input
                        type="password"
                        autoComplete="current-password"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        required
                        className={cm.cn(
                          cm.sp('px', 3),
                          cm.sp('py', 2),
                          'w-full border border-outline-variant rounded-md',
                        )}
                      />
                    </label>
                    {deleteError ? (
                      <p className={cm.cn(cm.textSize('sm'), 'text-error')}>{deleteError}</p>
                    ) : null}
                    <div className={cm.flex({ align: 'center', gap: 'sm' })}>
                      <button
                        type="submit"
                        disabled={deleteLoading}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.fontWeight('semibold'),
                          'bg-error text-on-error rounded-md disabled:opacity-50',
                        )}
                      >
                        {deleteLoading
                          ? t(
                              'settings.deleteAccountModal.deleting',
                              {},
                              { defaultValue: 'Deleting…' },
                            )
                          : t(
                              'settings.deleteAccount.confirm',
                              {},
                              { defaultValue: 'Permanently delete account' },
                            )}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowDelete(false)
                          setDeletePassword('')
                          setDeleteError(null)
                        }}
                        className={cm.cn(
                          cm.sp('px', 4),
                          cm.sp('py', 2),
                          cm.fontWeight('medium'),
                          'text-on-surface-variant hover:text-on-surface',
                        )}
                      >
                        {t('common.cancel', {}, { defaultValue: 'Cancel' })}
                      </button>
                    </div>
                  </form>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowDelete(true)}
                    className={cm.cn(
                      cm.sp('px', 4),
                      cm.sp('py', 2),
                      cm.fontWeight('semibold'),
                      'border border-error text-error rounded-md hover:bg-error/10',
                    )}
                  >
                    {t('settings.deleteAccount', {}, { defaultValue: 'Delete account' })}
                  </button>
                )}
              </section>
            </>
          )}

          {section === 'billing' &&
            (billingLoading ? (
              <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.billing', {}, { defaultValue: 'Billing' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('settings.billing.loading', {}, { defaultValue: 'Loading billing…' })}
                </p>
              </div>
            ) : !billing ? (
              <div className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.billing', {}, { defaultValue: 'Billing' })}
                </h2>
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('settings.billing.empty', {}, { defaultValue: 'No billing details yet.' })}
                </p>
              </div>
            ) : (
              <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
                <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                  {t('settings.billing', {}, { defaultValue: 'Billing' })}
                </h2>
                <>
                  <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                    {t(
                      'settings.billing.body',
                      {
                        plan: billing.plan_name ?? 'Free',
                        used: (billing.requests_used ?? 0).toLocaleString(),
                        quota: (billing.requests_quota ?? 0).toLocaleString(),
                      },
                      {
                        defaultValue: '{{plan}} plan. {{used}} of {{quota}} monthly requests used.',
                      },
                    )}
                  </p>
                  <div
                    className={cm.cn('h-2', cm.roundedFull, 'bg-surface-container overflow-hidden')}
                  >
                    <div
                      className={cm.cn('h-full bg-primary', cm.roundedFull)}
                      style={{ width: `${usagePct}%` }}
                    />
                  </div>
                  <Link
                    to="/settings/billing"
                    className={cm.cn(
                      cm.textSize('sm'),
                      cm.textPrimary,
                      'hover:underline inline-block',
                    )}
                  >
                    {t(
                      'settings.billing.viewDetailsCta',
                      {},
                      { defaultValue: 'View billing details →' },
                    )}
                  </Link>
                </>
              </section>
            ))}

          {section === 'team' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('nav.team', {}, { defaultValue: 'Team' })}
              </h2>
              {membersLoading ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t('settings.team.loading', {}, { defaultValue: 'Loading team…' })}
                </p>
              ) : members.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.team.empty',
                    {},
                    { defaultValue: 'No team members yet — invite some from the team page.' },
                  )}
                </p>
              ) : (
                <ul className={cm.cn('space-y-2')}>
                  {members.map((m) => (
                    <li
                      key={m.id}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('py', 2),
                        'border-b border-outline-variant last:border-b-0',
                      )}
                    >
                      <div>
                        <p className={cm.fontWeight('medium')}>{m.email ?? m.id}</p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {m.role ?? 'viewer'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMember(m.id)}
                        className={cm.cn(cm.textSize('sm'), 'text-error hover:underline')}
                      >
                        {t('common.remove', {}, { defaultValue: 'Remove' })}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {section === 'integrations' && (
            <section className={cm.cn(cm.card(), cm.sp('p', 5), 'space-y-3')}>
              <h2 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
                {t('nav.integrations', {}, { defaultValue: 'Integrations' })}
              </h2>
              {integrationsLoading ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.integrations.loading',
                    {},
                    { defaultValue: 'Loading integrations…' },
                  )}
                </p>
              ) : integrations.length === 0 ? (
                <p className={cm.cn(cm.textSize('sm'), 'text-on-surface-variant')}>
                  {t(
                    'settings.integrations.empty',
                    {},
                    { defaultValue: 'No integrations available yet.' },
                  )}
                </p>
              ) : (
                <ul className={cm.cn('space-y-2')}>
                  {integrations.map((i) => (
                    <li
                      key={i.id}
                      className={cm.cn(
                        cm.flex({ align: 'center', justify: 'between' }),
                        cm.sp('py', 2),
                        'border-b border-outline-variant last:border-b-0',
                      )}
                    >
                      <div>
                        <p className={cm.fontWeight('medium')}>{i.name}</p>
                        <p className={cm.cn(cm.textSize('xs'), 'text-on-surface-variant')}>
                          {i.status === 'connected'
                            ? t('status.connected', {}, { defaultValue: 'Connected' })
                            : t(
                                'settings.integrations.notConnected',
                                {},
                                { defaultValue: 'Not connected' },
                              )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleIntegration(i.id)}
                        className={cm.cn(cm.textSize('sm'), cm.textPrimary, 'hover:underline')}
                      >
                        {i.status === 'connected'
                          ? t('common.disconnect', {}, { defaultValue: 'Disconnect' })
                          : t('common.connect', {}, { defaultValue: 'Connect' })}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
