import type { FormEvent, JSX, ReactNode } from 'react'
import { useState } from 'react'

import { useTranslation } from '@molecule/app-react'
import { slot } from '@molecule/app-react/render'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Textarea } from '@molecule/app-ui-react'

/** Shape of values collected by the contact form and passed to `onSubmit`. */
export interface ContactFormValues {
  name: string
  email: string
  message: string
  /** App-supplied additional fields. */
  [key: string]: string
}

/** Props for {@link ContactForm}. */
export interface ContactFormProps {
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
 * @param props - Component props (see {@link ContactFormProps}).
 */
export function ContactForm({
  onSubmit,
  title: titleProp,
  description: descriptionProp,
  submitLabel,
  successContent,
  extraFields,
  className,
}: ContactFormProps): JSX.Element | null {
  const title = slot(titleProp)
  const description = slot(descriptionProp)
  const cm = getClassMap()
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Handles form submission: calls `onSubmit` with collected values and manages submitting/error state.
   * @param e
   */
  async function handle(e: FormEvent): Promise<void> {
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
      setError(
        err instanceof Error
          ? err.message
          : t('contactForm.error.submissionFailed', {}, { defaultValue: 'Submission failed' }),
      )
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
        aria-label={t('contactForm.label.name', {}, { defaultValue: 'Name' })}
      />
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
        placeholder={t('contactForm.email', {}, { defaultValue: 'you@example.com' })}
        required
        aria-label={t('contactForm.label.email', {}, { defaultValue: 'Email' })}
      />
      {extraFields}
      <Textarea
        value={message}
        onChange={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
        placeholder={t('contactForm.message', {}, { defaultValue: 'How can we help?' })}
        required
        rows={5}
        aria-label={t('contactForm.label.message', {}, { defaultValue: 'Message' })}
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
