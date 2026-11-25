<!--
  Form: awaits onFormSubmit(data) / onSubmit, disables its fieldset while
  pending and renders rejected submissions as an accessible error list.
-->
<script module lang="ts">
  // Web bundlers substitute this at build time.
  declare const process: { env: { NODE_ENV?: string } }
</script>

<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { ReactFormProps } from './form.js'
  import { formSubmitErrorMessages } from './form-submit-error.js'

  let {
    ref = $bindable(null),
    children,
    onFormSubmit,
    submitting,
    className,
    style,
    testId,
    onSubmit,
    action,
    method,
    noValidate,
    ...rest
  }: ReactFormProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  let failure = $state<{ error: unknown } | null>(null)
  let pending = $state(false)
  let attempt = 0

  $effect(() => {
    return () => {
      attempt += 1
    }
  })

  const handleSubmit = (e: SubmitEvent): void => {
    if (!onFormSubmit && !onSubmit) return
    const current = ++attempt
    failure = null
    pending = true
    void (async () => {
      try {
        const submissions: Promise<void>[] = []
        const call = (handler: () => void | Promise<void>): void => {
          try {
            submissions.push(Promise.resolve(handler()))
          } catch (error) {
            submissions.push(Promise.reject(error))
          }
        }
        if (onFormSubmit) {
          e.preventDefault()
          const entries = Array.from(new FormData(e.currentTarget as HTMLFormElement))
          // `Object.fromEntries` defines every name as an own key: a repeated name
          // keeps its last value, and `__proto__` stays an ordinary field instead
          // of replacing the object's prototype.
          const data: Record<string, unknown> = Object.fromEntries(entries)
          if (process.env.NODE_ENV !== 'production' && Object.keys(data).length < entries.length) {
            console.error(
              "Form.onFormSubmit received repeated field names and keeps only their last values. Use the form's onSubmit handler for repeated entries.",
            )
          }
          call(() => onFormSubmit(data))
        }
        // Call both handlers before yielding: the native event's currentTarget is still valid.
        call(() => onSubmit?.(e))
        await Promise.all(submissions)
      } catch (error) {
        if (attempt === current) failure = { error }
      } finally {
        if (attempt === current) pending = false
      }
    })()
  }

  // A caller-managed failure arrives as the submitError prop; its PRESENCE
  // (not its value) switches the source of the rendered messages.
  const { submitError } = $derived(rest)
  const error = $derived(
    'submitError' in rest ? (submitError === undefined ? null : { error: submitError }) : failure,
  )
  const formRest = $derived.by(() => {
    const { submitError: _submitError, ...others } = rest
    return others
  })
  const messages = $derived(
    error
      ? formSubmitErrorMessages(
          error.error,
          t('ui.form.submitError', undefined, {
            defaultValue: 'Unable to submit. Please try again.',
          }),
        )
      : [],
  )
</script>

<form
  bind:this={ref}
  class={className}
  use:reactStyle={style}
  data-testid={testId}
  {action}
  {method}
  novalidate={noValidate}
  onsubmit={handleSubmit}
  {...reactAttrs(withoutEvents(formRest))}
  use:spreadEvents={formRest}
>
  {#if messages.length > 0}
    <ul role="alert" class={cm.formError}>
      {#each messages as message, index (index)}
        <li>{message}</li>
      {/each}
    </ul>
  {/if}
  <fieldset disabled={submitting || pending} class={cm.formFieldsetContents}>
    {@render children?.()}
  </fieldset>
</form>
