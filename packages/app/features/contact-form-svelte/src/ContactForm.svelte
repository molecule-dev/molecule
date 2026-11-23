<!--
  ContactForm: the Svelte counterpart of `@molecule/app-contact-form-react`'s
  `ContactForm` — name + email + message fields with an `extraFields` slot and
  its own submitting / error / success state. Same props, same DOM for the same
  input; the node props are snippets (or plain strings) and every visible string
  goes through `t()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Input, Textarea } from '@molecule/app-ui-svelte'

  import type { ContactFormProps, ContactFormValues } from './types.js'

  let {
    onSubmit,
    title,
    description,
    submitLabel,
    successContent,
    extraFields,
    className,
  }: ContactFormProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let name = $state('')
  let email = $state('')
  let message = $state('')
  let submitting = $state(false)
  let submitted = $state(false)
  let error = $state<string | null>(null)

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const namePlaceholder = $derived(t('contactForm.name', {}, { defaultValue: 'Your name' }))
  const emailPlaceholder = $derived(t('contactForm.email', {}, { defaultValue: 'you@example.com' }))
  const messagePlaceholder = $derived(
    t('contactForm.message', {}, { defaultValue: 'How can we help?' }),
  )
  const nameLabel = $derived(t('contactForm.label.name', {}, { defaultValue: 'Name' }))
  const emailLabel = $derived(t('contactForm.label.email', {}, { defaultValue: 'Email' }))
  const messageLabel = $derived(t('contactForm.label.message', {}, { defaultValue: 'Message' }))
  const sendingText = $derived(t('contactForm.sending', {}, { defaultValue: 'Sending…' }))
  const sendText = $derived(t('contactForm.send', {}, { defaultValue: 'Send message' }))

  /**
   * Handles form submission: calls `onSubmit` with collected values and manages
   * submitting/error state (React's `handle`).
   *
   * @param event - The submit event.
   */
  async function handle(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (submitting) return
    submitting = true
    error = null
    try {
      await onSubmit({ name, email, message } as ContactFormValues)
      submitted = true
      name = ''
      email = ''
      message = ''
    } catch (err: unknown) {
      // React's own fallback string goes through i18n (contactForm.error.submissionFailed),
      // so the ports call the same key for DOM parity.
      error =
        err instanceof Error
          ? err.message
          : t('contactForm.error.submissionFailed', {}, { defaultValue: 'Submission failed' })
    } finally {
      submitting = false
    }
  }
</script>

{#if submitted && successContent !== undefined}
  <div class={className}>
    {#if typeof successContent === 'function'}{@render successContent?.()}{:else if successContent !== null}{successContent}{/if}
  </div>
{:else}
  <form class={cm.cn(cm.stack(3), className)} onsubmit={handle}>
    {#if title || description}
      <header class={cm.stack(1)}>
        {#if title}
          <h3 class={cm.cn(cm.textSize('lg'), cm.fontWeight('semibold'))}>
            {#if typeof title === 'function'}{@render title?.()}{:else}{title}{/if}
          </h3>
        {/if}
        {#if description}
          <p class={cm.textSize('sm')}>
            {#if typeof description === 'function'}{@render description?.()}{:else}{description}{/if}
          </p>
        {/if}
      </header>
    {/if}
    <Input
      type="text"
      value={name}
      onChange={(event: Event) => (name = (event.target as HTMLInputElement).value)}
      placeholder={namePlaceholder}
      required
      aria-label={nameLabel}
    />
    <Input
      type="email"
      value={email}
      onChange={(event: Event) => (email = (event.target as HTMLInputElement).value)}
      placeholder={emailPlaceholder}
      required
      aria-label={emailLabel}
    />
    {#if extraFields}
      {#if typeof extraFields === 'function'}{@render extraFields?.()}{:else}{extraFields}{/if}
    {/if}
    <Textarea
      value={message}
      onChange={(event: Event) => (message = (event.target as HTMLTextAreaElement).value)}
      placeholder={messagePlaceholder}
      required
      rows={5}
      aria-label={messageLabel}
    />
    {#if error}
      <p class={cm.textSize('sm')}>{error}</p>
    {/if}
    <Button type="submit" variant="solid" color="primary" disabled={submitting}>
      {#if submitting}
        {sendingText}
      {:else if typeof submitLabel === 'function'}
        {@render submitLabel?.()}
      {:else if submitLabel !== undefined && submitLabel !== null}
        {submitLabel}
      {:else}
        {sendText}
      {/if}
    </Button>
  </form>
{/if}
