import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input } from '@molecule/app-ui-react'

interface NewsletterSignupProps {
  /** Called with the email on submit. Return a Promise to block double-submit. */
  onSubscribe: (email: string) => void | Promise<void>
  /** Optional title above the form. */
  title?: ReactNode
  /** Optional supporting copy under the title. */
  description?: ReactNode
  /** Placeholder for the email input. */
  placeholder?: string
  /** Submit-button label. */
  buttonLabel?: ReactNode
  /** Rendered after successful subscription. */
  successContent?: ReactNode
  /** Layout — `'inline'` default (input + button on one row) or `'stacked'`. */
  layout?: 'inline' | 'stacked'
  /** Extra classes. */
  className?: string
}

/**
 * Email + subscribe button widget. Tracks its own submitting/error/success
 * state. Apps own the actual subscription side-effect via `onSubscribe`.
 * @param root0
 * @param root0.onSubscribe
 * @param root0.title
 * @param root0.description
 * @param root0.placeholder
 * @param root0.buttonLabel
 * @param root0.successContent
 * @param root0.layout
 * @param root0.className
 */
export function NewsletterSignup({
  onSubscribe,
  title,
  description,
  placeholder,
  buttonLabel,
  successContent,
  layout = 'inline',
  className,
}: NewsletterSignupProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   *
   * @param e
   */
  async function handle(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setSubmitting(true)
    setError(null)
    try {
      await onSubscribe(email)
      setSubmitted(true)
      setEmail('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Subscription failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted && successContent !== undefined) {
    return <div className={className}>{successContent}</div>
  }

  return (
    <form onSubmit={handle} className={cm.cn(cm.stack(2), className)}>
      {title && <h4 className={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{title}</h4>}
      {description && <p className={cm.textSize('sm')}>{description}</p>}
      <div className={layout === 'inline' ? cm.flex({ align: 'center', gap: 'sm' }) : cm.stack(2)}>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          placeholder={
            placeholder ?? t('newsletter.placeholder', {}, { defaultValue: 'Your email' })
          }
          required
          aria-label="Email"
          className={layout === 'inline' ? cm.flex1 : undefined}
        />
        <Button type="submit" variant="solid" color="primary" disabled={submitting}>
          {submitting
            ? t('newsletter.subscribing', {}, { defaultValue: 'Subscribing…' })
            : (buttonLabel ?? t('newsletter.subscribe', {}, { defaultValue: 'Subscribe' }))}
        </Button>
      </div>
      {error && <p className={cm.textSize('sm')}>{error}</p>}
    </form>
  )
}
