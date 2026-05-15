import { useEffect, useState } from 'react'

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
 * Email-editing section. Fetches `/users/me` on mount to refresh the
 * current user record (and write it back to the auth cache so
 * subsequent reloads see the latest data). On blur of the email
 * field, PATCHes `/api/users/:id` with the new email; reverts + shows
 * an inline error if the request fails.
 */
export function AccountSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const authClient = useAuthClient<UserProfile>()
  const http = useHttpClient()

  const cachedUser = authClient.getState().user
  const [email, setEmail] = useState(cachedUser?.email || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Refresh the current user via the canonical `/users/me` endpoint
  // on mount and push the result into the auth cache so reloads pick
  // up fresh data. Failures are silent — cached profile is the
  // fallback.
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
        }
      })
      .catch(() => {
        /* refresh is best-effort */
      })
    return () => {
      cancelled = true
    }
  }, [http, authClient, cachedUser?.email])

  const handleBlur = async () => {
    const currentUser = authClient.getState().user
    if (email === currentUser?.email || !email) return
    setSaving(true)
    setError('')
    try {
      await http.patch(`/api/users/${currentUser?.id}`, { email })
      // Update the auth cache so a reload reflects the new email.
      if (currentUser) authClient.setUser({ ...currentUser, email })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.failedToUpdateEmail'))
      setEmail(currentUser?.email || '')
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
      <div>
        <label htmlFor="settings-email" className={cm.formLabelSmall}>
          {t('settings.email')}
        </label>
        <Input
          id="settings-email"
          type="email"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          onBlur={handleBlur}
          size="sm"
        />
        {error && <p className={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>{error}</p>}
      </div>
    </section>
  )
}
