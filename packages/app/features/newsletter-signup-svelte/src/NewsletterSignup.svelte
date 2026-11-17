<!--
  NewsletterSignup: the Svelte counterpart of
  `@molecule/app-newsletter-signup-react`'s `NewsletterSignup` — email field +
  subscribe button with inline / stacked layouts, tracking its own submitting /
  error / success state. Same props, same DOM for the same input; the node
  props are snippets (or plain strings) and every visible string goes through
  `t()` so a locale switch re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Input } from '@molecule/app-ui-svelte'

  import type { NewsletterSignupProps } from './types.js'

  let {
    onSubscribe,
    title,
    description,
    placeholder,
    buttonLabel,
    successContent,
    layout = 'inline',
    className,
  }: NewsletterSignupProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  let email = $state('')
  let submitting = $state(false)
  let submitted = $state(false)
  let error = $state<string | null>(null)

  const inline = $derived(layout === 'inline')
  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so these re-run on a locale switch the way React's render-time `t`
  // calls re-run on a re-render.
  const placeholderText = $derived(
    placeholder ?? t('newsletter.placeholder', {}, { defaultValue: 'Your email' }),
  )
  const subscribingText = $derived(
    t('newsletter.subscribing', {}, { defaultValue: 'Subscribing…' }),
  )
  const subscribeText = $derived(t('newsletter.subscribe', {}, { defaultValue: 'Subscribe' }))
  const emailLabelText = $derived(t('newsletter.label.email', {}, { defaultValue: 'Email' }))

  /**
   * Handles form submit: calls onSubscribe and tracks submitting/error/success
   * state (React's `handle`).
   *
   * @param event - The submit event.
   */
  async function handle(event: SubmitEvent): Promise<void> {
    event.preventDefault()
    if (submitting) return
    submitting = true
    error = null
    try {
      await onSubscribe(email)
      submitted = true
      email = ''
    } catch (err: unknown) {
      error =
        err instanceof Error
          ? err.message
          : t('newsletter.error.subscriptionFailed', {}, { defaultValue: 'Subscription failed' })
    } finally {
      submitting = false
    }
  }
</script>

{#if submitted && successContent !== undefined}
  <div class={className}>
    {#if typeof successContent === 'function'}{@render successContent()}{:else if successContent !== null}{successContent}{/if}
  </div>
{:else}
  <form class={cm.cn(cm.stack(2), className)} onsubmit={handle}>
    {#if title}
      <h4 class={cm.cn(cm.textSize('sm'), cm.fontWeight('semibold'))}>
        {#if typeof title === 'function'}{@render title()}{:else}{title}{/if}
      </h4>
    {/if}
    {#if description}
      <p class={cm.textSize('sm')}>
        {#if typeof description === 'function'}{@render description()}{:else}{description}{/if}
      </p>
    {/if}
    <div class={inline ? cm.flex({ align: 'center', gap: 'sm' }) : cm.stack(2)}>
      <Input
        type="email"
        value={email}
        onChange={(event: Event) => (email = (event.target as HTMLInputElement).value)}
        placeholder={placeholderText}
        required
        aria-label={emailLabelText}
        className={inline ? cm.flex1 : undefined}
      />
      <Button type="submit" variant="solid" color="primary" disabled={submitting}>
        {#if submitting}
          {subscribingText}
        {:else if typeof buttonLabel === 'function'}
          {@render buttonLabel()}
        {:else if buttonLabel !== undefined && buttonLabel !== null}
          {buttonLabel}
        {:else}
          {subscribeText}
        {/if}
      </Button>
    </div>
    {#if error}
      <p class={cm.textSize('sm')}>{error}</p>
    {/if}
  </form>
{/if}
