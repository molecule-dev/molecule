/**
 * Solid generic contact form: name + email + message fields, plus an
 * `extraFields` slot for app-specific inputs.
 *
 * Solid counterpart of `@molecule/app-contact-form-react`'s `ContactForm` — the
 * same props (React names), the same ClassMap tokens, and the same DOM for the
 * same input.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { createEffect, createSignal, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input, Textarea } from '@molecule/app-ui-solid'

import type { ContactFormProps } from './types.js'

/** The form's text fields, keyed by the aria-label they render. */
const FIELD_SELECTORS = {
  name: 'input[aria-label="Name"]',
  email: 'input[aria-label="Email"]',
  message: 'textarea[aria-label="Message"]',
} as const

/**
 * Generic name + email + message contact form with submit handling and
 * success state. `extraFields` slot lets apps add domain-specific inputs
 * (subject, phone, agent id, etc.).
 *
 * Always pass `successContent`: without it the form clears silently after a
 * successful submit with no user feedback. If `onSubmit` rejects, the thrown
 * `Error.message` is shown verbatim below the form — throw translated,
 * user-safe messages.
 *
 * @param props - Component props (see {@link ContactFormProps}).
 * @returns The rendered contact form.
 */
export const ContactForm: Component<ContactFormProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [name, setName] = createSignal('')
  const [email, setEmail] = createSignal('')
  const [message, setMessage] = createSignal('')
  const [submitting, setSubmitting] = createSignal(false)
  const [submitted, setSubmitted] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  let formEl: HTMLFormElement | undefined

  /**
   * Writes one field's live value property.
   *
   * @param selector - The field's CSS selector.
   * @param value - The controlled value.
   */
  const syncField = (selector: string, value: string): void => {
    const field = formEl?.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)
    if (field && field.value !== value) field.value = value
  }

  // React's controlled inputs write BOTH the `value` attribute and the live
  // property on every render. The UI package's `attr:value` covers the
  // attribute; this effect covers the property, so a cleared or rewritten
  // field reads the same (as `@molecule/app-ui-solid`'s own ports do).
  createEffect(() => {
    syncField(FIELD_SELECTORS.name, name())
    syncField(FIELD_SELECTORS.email, email())
    syncField(FIELD_SELECTORS.message, message())
  })

  /**
   * Handles form submission: calls `onSubmit` with collected values and manages submitting/error state.
   *
   * @param event - The submit event (React's `FormEvent`).
   */
  const handle = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault()
    if (submitting()) return
    setSubmitting(true)
    setError(null)
    try {
      await props.onSubmit({ name: name(), email: email(), message: message() })
      setSubmitted(true)
      setName('')
      setEmail('')
      setMessage('')
    } catch (err: unknown) {
      // React hardcodes this fallback (no i18n key), so the ports keep the
      // same string for DOM parity.
      setError(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Show
      when={!(submitted() && props.successContent !== undefined)}
      fallback={<div class={props.className}>{props.successContent}</div>}
    >
      <form
        ref={(node: HTMLFormElement) => {
          formEl = node
        }}
        onSubmit={handle}
        class={cm.cn(cm.stack(3), props.className)}
      >
        {(props.title || props.description) && (
          <header class={cm.stack(1)}>
            {props.title && (
              <h3 class={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>{props.title}</h3>
            )}
            {props.description && <p class={cm.textSize('sm')}>{props.description}</p>}
          </header>
        )}
        <Input
          type="text"
          value={name()}
          onChange={(event: Event) => setName((event.target as HTMLInputElement).value)}
          placeholder={t('contactForm.name', {}, { defaultValue: 'Your name' })}
          required
          aria-label="Name"
        />
        <Input
          type="email"
          value={email()}
          onChange={(event: Event) => setEmail((event.target as HTMLInputElement).value)}
          placeholder={t('contactForm.email', {}, { defaultValue: 'you@example.com' })}
          required
          aria-label="Email"
        />
        {props.extraFields}
        <Textarea
          value={message()}
          onChange={(event: Event) => setMessage((event.target as HTMLTextAreaElement).value)}
          placeholder={t('contactForm.message', {}, { defaultValue: 'How can we help?' })}
          required
          rows={5}
          aria-label="Message"
        />
        {error() && <p class={cm.textSize('sm')}>{error()}</p>}
        <Button type="submit" variant="solid" color="primary" disabled={submitting()}>
          {submitting()
            ? t('contactForm.sending', {}, { defaultValue: 'Sending…' })
            : (props.submitLabel ?? t('contactForm.send', {}, { defaultValue: 'Send message' }))}
        </Button>
      </form>
    </Show>
  )
}
