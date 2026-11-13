<!--
  Form: awaits onFormSubmit(data) / onSubmit, disables its fieldset while
  pending and renders rejected submissions as an accessible error list.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { useI18n } from '../framework.js'
  import { reactStyle } from '../style.js'
  import type { FormProps } from '../types.js'
  import { formSubmitErrorMessages } from './form-submit-error.js'

  let {
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
  }: FormProps = $props()

  const { t } = useI18n()
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
          const formData = new FormData(e.currentTarget as HTMLFormElement)
          const data: Record<string, unknown> = {}
          formData.forEach((value, key) => {
            data[key] = value
          })
          call(() => onFormSubmit(data))
        }
        // Call both handlers before yielding: the native event's currentTarget is still valid.
        call(() => onSubmit?.(e as unknown as Event))
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
          $t('ui.form.submitError', undefined, {
            defaultValue: 'Unable to submit. Please try again.',
          }),
        )
      : [],
  )
</script>

<form
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
