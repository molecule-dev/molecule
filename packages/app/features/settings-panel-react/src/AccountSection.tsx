import { type JSX, useEffect } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuthClient, useHttpClient, useProfileForm, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Input, Spinner } from '@molecule/app-ui-react'

interface ApiUserResponse {
  props?: UserProfile
  id?: string
  email?: string
  name?: string
}

type AccountValues = {
  name: string
  email: string
}

/**
 * Account fields over the shared profile lifecycle; local refresh stays best-effort.
 *
 * `UserProfile.email` is optional (phone/handle accounts have none), so email is
 * validated only when non-empty and a blank email is never sent: clearing the
 * field leaves the stored address untouched, and a name-only account can still
 * save its name.
 *
 * @returns The account settings section.
 */
export function AccountSection(): JSX.Element {
  const cm = getClassMap()
  const { t } = useTranslation()
  const authClient = useAuthClient<UserProfile>()
  const http = useHttpClient()
  const profile = useProfileForm<UserProfile, AccountValues>({
    defaultValues: { name: '', email: '' },
    toValues: (user) => ({ name: user.name ?? '', email: user.email ?? '' }),
    toPatch: ({ email, ...changes }) => (email ? { ...changes, email } : changes),
  })

  useEffect(() => {
    let cancelled = false
    http
      .get<ApiUserResponse>('/api/users/me')
      .then((res) => {
        if (cancelled) return
        const body = (res as { data?: ApiUserResponse }).data ?? (res as ApiUserResponse)
        const next = (body.props ?? body) as UserProfile | undefined
        if (next && typeof next === 'object' && next.id) authClient.setUser(next)
      })
      .catch(() => {
        /* refresh is best-effort */
      })
    return () => {
      cancelled = true
    }
  }, [http, authClient])

  const name = profile.register('name')
  const email = profile.register('email', { email: true })
  const emailError = profile.getError('email')
  const saveOnBlur =
    (onBlur: () => void): (() => void) =>
    () => {
      onBlur()
      void profile.submit()
    }

  return (
    <section>
      <Flex align="center" gap="sm" className={cm.sp('mb', 3)}>
        <h3 className={cm.sectionHeading}>{t('settings.account')}</h3>
        {profile.isSubmitting && <Spinner size="xs" />}
      </Flex>
      <form {...profile.formProps} className={cm.stack(3)}>
        <div>
          <label htmlFor="settings-name" className={cm.formLabelSmall}>
            {t('settings.name', undefined, { defaultValue: 'Name' })}
          </label>
          <Input
            {...name}
            id="settings-name"
            type="text"
            onBlur={saveOnBlur(name.onBlur)}
            autoComplete="name"
            size="sm"
          />
        </div>
        <div>
          <label htmlFor="settings-email" className={cm.formLabelSmall}>
            {t('settings.email')}
          </label>
          <Input
            {...email}
            id="settings-email"
            type="email"
            onBlur={saveOnBlur(email.onBlur)}
            autoComplete="email"
            size="sm"
            aria-invalid={emailError ? true : undefined}
            aria-describedby={emailError ? 'settings-email-error' : undefined}
          />
          {emailError ? (
            <p
              id="settings-email-error"
              role="alert"
              className={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}
            >
              {emailError}
            </p>
          ) : null}
          {profile.error ? (
            <p role="alert" className={cm.cn(cm.textSize('xs'), cm.textError, cm.sp('mt', 1))}>
              {profile.error instanceof Error
                ? profile.error.message
                : t('settings.failedToUpdateProfile', undefined, {
                    defaultValue: 'Failed to update profile',
                  })}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  )
}
