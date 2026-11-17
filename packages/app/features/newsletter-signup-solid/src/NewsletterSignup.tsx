/**
 * Solid email subscribe form: email field + subscribe button, with its own
 * submitting / error / success state.
 *
 * Solid counterpart of `@molecule/app-newsletter-signup-react`'s
 * `NewsletterSignup` — the same props (React names), the same ClassMap tokens,
 * and the same DOM for the same input.
 *
 * @module
 */

import type { Component } from 'solid-js'
import { createEffect, createSignal, Show } from 'solid-js'

import { useTranslation } from '@molecule/app-solid'
import { getClassMap } from '@molecule/app-ui'
import { Button, Input } from '@molecule/app-ui-solid'

import type { NewsletterSignupProps } from './types.js'

/**
 * Email + subscribe button widget. Tracks its own submitting/error/success
 * state. Apps own the actual subscription side-effect via `onSubscribe`.
 *
 * Always pass `successContent` — without it a successful submit only clears
 * the input and re-renders the empty form. Return a Promise from `onSubscribe`
 * so double-submits are blocked while in flight; a rejected Promise renders
 * the error's `message` verbatim below the form.
 *
 * @param props - Component props (see {@link NewsletterSignupProps}).
 * @returns The rendered newsletter signup form.
 */
export const NewsletterSignup: Component<NewsletterSignupProps> = (props) => {
  const cm = getClassMap()
  const { t } = useTranslation()
  const [email, setEmail] = createSignal('')
  const [submitting, setSubmitting] = createSignal(false)
  const [submitted, setSubmitted] = createSignal(false)
  const [error, setError] = createSignal<string | null>(null)

  let formEl: HTMLFormElement | undefined

  // React's controlled input writes BOTH the `value` attribute and the live
  // property on every render. The Input's `attr:value` covers the attribute;
  // this effect covers the property, so a cleared or rewritten email reads the
  // same in the field (as `@molecule/app-ui-solid`'s own ports do).
  createEffect(() => {
    const text = email()
    const input = formEl?.querySelector('input')
    if (input && input.value !== text) input.value = text
  })

  const inline = (): boolean => (props.layout ?? 'inline') === 'inline'

  /**
   * Handles form submit: calls onSubscribe and tracks submitting/error/success state.
   *
   * @param event - The submit event (React's `FormEvent`).
   */
  const handle = async (event: SubmitEvent): Promise<void> => {
    event.preventDefault()
    if (submitting()) return
    setSubmitting(true)
    setError(null)
    try {
      await props.onSubscribe(email())
      setSubmitted(true)
      setEmail('')
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : t('newsletter.error.subscriptionFailed', {}, { defaultValue: 'Subscription failed' }),
      )
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
        class={cm.cn(cm.stack(2), props.className)}
      >
        {props.title && (
          <h4 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>{props.title}</h4>
        )}
        {props.description && <p class={cm.textSize('sm')}>{props.description}</p>}
        <div class={inline() ? cm.flex({ align: 'center', gap: 'sm' }) : cm.stack(2)}>
          <Input
            type="email"
            value={email()}
            onChange={(event: Event) => setEmail((event.target as HTMLInputElement).value)}
            placeholder={
              props.placeholder ?? t('newsletter.placeholder', {}, { defaultValue: 'Your email' })
            }
            required
            aria-label={t('newsletter.label.email', {}, { defaultValue: 'Email' })}
            className={inline() ? cm.flex1 : undefined}
          />
          <Button type="submit" variant="solid" color="primary" disabled={submitting()}>
            {submitting()
              ? t('newsletter.subscribing', {}, { defaultValue: 'Subscribing…' })
              : (props.buttonLabel ?? t('newsletter.subscribe', {}, { defaultValue: 'Subscribe' }))}
          </Button>
        </div>
        {error() && <p class={cm.textSize('sm')}>{error()}</p>}
      </form>
    </Show>
  )
}
