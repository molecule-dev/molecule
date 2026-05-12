import { useState } from 'react'

import type { UserProfile } from '@molecule/app-auth'
import { useAuth, useHttpClient, useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Flex, Input, Spinner } from '@molecule/app-ui-react'

/**
 * Email-editing section. On blur, PATCHes `/users/:id` with the new
 * email; reverts + shows an inline error if the request fails.
 */
export function AccountSection() {
  const cm = getClassMap()
  const { t } = useTranslation()
  const { user } = useAuth<UserProfile>()
  const http = useHttpClient()

  const [email, setEmail] = useState(user?.email || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleBlur = async () => {
    if (email === user?.email || !email) return
    setSaving(true)
    setError('')
    try {
      await http.patch(`/users/${user?.id}`, { data: { email } })
    } catch (err) {
      setError(err instanceof Error ? err.message : t('settings.failedToUpdateEmail'))
      setEmail(user?.email || '')
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
