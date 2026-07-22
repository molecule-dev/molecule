import { type JSX, useEffect, useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuthClient, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Input, Spinner } from '@molecule/app-ui-react'

interface ApiUserResponse {
  props?: UserProfile
  id?: string
  email?: string
  name?: string
}

/**
 * Account section — edits the user's display name + email. Fetches
 * `/users/me` on mount to refresh the current user record (and write it
 * back to the auth cache so subsequent reloads see the latest data). On
 * blur of either field, PATCHes `/api/users/:id` with the changed field;
 * reverts + shows an inline error if the request fails.
 *
 * The user resource's update handler accepts `name`, `username`, and
 * `email`; this surfaces `name` + `email` (the universally-present
 * profile fields). Apps that use a public `username` handle can extend
 * this with a username field the same way.
 */
export function AccountSection(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const authClient = useAuthClient<UserProfile>()
  const http = useHttpClient()

  const cachedUser = authClient.getState().user
  const [email, setEmail] = useState(cachedUser?.email || '')
  const [name, setName] = useState(cachedUser?.name || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Refresh the current user via the canonical `/users/me` endpoint on
  // mount and push the result into the auth cache so reloads pick up
  // fresh data. Failures are silent — the cached profile is the fallback.
  useEffect(() => {
    let cancelled = false
    http
      .get<ApiUserResponse>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: ApiUserResponse }).data ?? (res as ApiUserResponse)
        const next = (body.props ?? body) as UserProfile | undefined
        if (next && typeof next === 'object' && (next as UserProfile).id) {
          authClient.setUser(next)
          setEmail((curr) =>
            curr === (cachedUser?.email || '') ? (next.email as string | undefined) || curr : curr,
          )
          setName((curr) =>
            curr === (cachedUser?.name || '') ? (next.name as string | undefined) || curr : curr,
          )
        }
      })
      .catch(() => {
        /* refresh is best-effort */
      })
    return () => {
      cancelled = true
    }
  }, [http, authClient, cachedUser?.email, cachedUser?.name])

  const saveField = async (field: 'email' | 'name', value: string): Promise<void> => {
    const currentUser = authClient.getState().user
    if (value === (currentUser?.[field] || '')) return
    if (field === 'email' && !value) return
    setSaving(true)
    setError('')
    try {
      await http.patch(`/api/users/${currentUser?.id}`, { [field]: value })
      // Update the auth cache so a reload reflects the new value.
      if (currentUser) authClient.setUser({ ...currentUser, [field]: value })
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('settings.failedToUpdateProfile', undefined, {
              defaultValue: 'Failed to update profile',
            }),
      )
      if (field === 'email') setEmail(currentUser?.email || '')
      else setName(currentUser?.name || '')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section>
      <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
        <h3 className={cm.sectionHeading}>{t('settings.account')}</h3>
        {saving && <Spinner size="xs" />}
      </Flex>
      <div className={cm.stack(3)}>
        <div>
          <label htmlFor="settings-name" className={cm.formLabelSmall}>
            {t('settings.name', undefined, { defaultValue: 'Name' })}
          </label>
          <Input
            id="settings-name"
            type="text"
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            onBlur={() => saveField('name', name)}
            autoComplete="name"
            size="sm"
          />
        </div>
        <div>
          <label htmlFor="settings-email" className={cm.formLabelSmall}>
            {t('settings.email')}
          </label>
          <Input
            id="settings-email"
            type="email"
            value={email}
            onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
            onBlur={() => saveField('email', email)}
            autoComplete="email"
            size="sm"
          />
          {error && (
            <p role="alert" className={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
