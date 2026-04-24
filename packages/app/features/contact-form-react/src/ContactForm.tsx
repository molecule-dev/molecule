import type { FormEvent, ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Textarea } from '@molecule/app-ui-react'

/**
 *
 */
export interface ContactFormValues {
  name: string
  email: string
  message: string
  /** App-supplied additional fields. */
  [key: string]: string
}

interface ContactFormProps {
  /** Called with the form values on submit. Return a Promise to block double-submit. */
  onSubmit: (values: ContactFormValues) => void | Promise<void>
  /** Form heading. */
  title?: ReactNode
  /** Optional supporting copy under the heading. */
  description?: ReactNode
  /** Custom submit-button label. */
  submitLabel?: ReactNode
  /** Rendered when the form successfully submits. */
  successContent?: ReactNode
  /** Extra fields rendered above the message textarea. */
  extraFields?: ReactNode
  /** Extra classes. */
  className?: string
}

/**
 * Generic name + email + message contact form with submit handling and
 * success state. `extraFields` slot lets apps add domain-specific
 * inputs (subject, phone, agent id, etc.).
 * @param root0
 * @param root0.onSubmit
 * @param root0.title
 * @param root0.description
 * @param root0.submitLabel
 * @param root0.successContent
 * @param root0.extraFields
 * @param root0.className
 */
export function ContactForm({
  onSubmit,
  title,
  description,
  submitLabel,
  successContent,
  extraFields,
  className,
}: ContactFormProps) {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
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
      await onSubmit({ name, email, message })
      setSubmitted(true)
      setName('')
      setEmail('')
      setMessage('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted && successContent !== undefined) {
    return <div className={className}>{successContent}</div>
  }

  return (
    <form onSubmit={handle} className={cm.cn(cm.stack(3), className)}>
      {(title || description) && (
        <header className={cm.stack(1 as const)}>
          {title && (
            <h3 className={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>{title}</h3>
          )}
          {description && <p className={cm.textSize('sm')}>{description}</p>}
        </header>
      )}
      <Input
        type="text"
        value={name}
        onChange={(e) => setName((e.target as HTMLInputElement).value)}
        placeholder={t('contactForm.name', {}, { defaultValue: 'Your name' })}
        required
        aria-label="Name"
      />
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
        placeholder={t('contactForm.email', {}, { defaultValue: 'you@example.com' })}
        required
        aria-label="Email"
      />
      {extraFields}
      <Textarea
        value={message}
        onChange={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
        placeholder={t('contactForm.message', {}, { defaultValue: 'How can we help?' })}
        required
        rows={5}
        aria-label="Message"
      />
      {error && <p className={cm.textSize('sm')}>{error}</p>}
      <Button type="submit" variant="solid" color="primary" disabled={submitting}>
        {submitting
          ? t('contactForm.sending', {}, { defaultValue: 'Sending…' })
          : (submitLabel ?? t('contactForm.send', {}, { defaultValue: 'Send message' }))}
      </Button>
    </form>
  )
}
