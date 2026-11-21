<!--
  WebhookInspector: the Svelte counterpart of
  `@molecule/app-webhook-inspector-react`'s `WebhookInspector` — one `<details>`
  row per delivery with a colored status-code badge, event type, optional
  attempt/duration and a retry button on failed rows, expanding to the request
  and response JSON panels. Same props, same DOM for the same input. Node-valued
  delivery fields accept a snippet or plain text.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import type { ColorVariant } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'

  import { reactStyle } from './style.js'
  import type { WebhookDelivery, WebhookInspectorProps } from './types.js'

  let { deliveries, onRetry, onSelect, selectedId, className }: WebhookInspectorProps = $props()

  /** Stable base for the per-delivery ids this render mints (React's `useId`). */
  const idPrefix: string = $props.id()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so the labels re-render on a locale switch the way React's
  // render-time `t` calls do.
  const retryLabel = $derived(t('webhookInspector.retry', undefined, { defaultValue: 'Retry' }))
  const requestLabel = $derived(
    t('webhookInspector.request', undefined, { defaultValue: 'Request' }),
  )
  const responseLabel = $derived(
    t('webhookInspector.response', undefined, { defaultValue: 'Response' }),
  )

  /**
   * Returns the semantic tone for the given delivery status: the theme's
   * success green, error red, or warning amber for a pending delivery.
   *
   * @param status - The delivery status.
   * @returns The badge's tone.
   */
  function statusTone(status: WebhookDelivery['status']): ColorVariant {
    if (status === 'success') return 'success'
    if (status === 'failure') return 'error'
    return 'warning'
  }

  /**
   * Serialises a request/response body value to a display string.
   *
   * @param value - The body value.
   * @returns The text to render.
   */
  function stringify(value: string | unknown | undefined): string {
    if (value === undefined) return ''
    if (typeof value === 'string') return value
    try {
      return JSON.stringify(value, null, 2)
    } catch (_error) {
      // JSON.stringify can throw for circular references; String() fallback is safe here.
      return String(value)
    }
  }
</script>

<div class={cm.cn(cm.stack(1), className)}>
  {#each deliveries as delivery, index (delivery.id)}
    {@const timestamp = delivery.timestamp}
    {@const retryable = Boolean(onRetry) && delivery.status === 'failure'}
    <!-- Names the event-type span so the retry button can describe itself by it. -->
    {@const eventTypeId = `${idPrefix}-event-${index}`}
    <!-- The retry button is a SIBLING of the `<details>`, never inside the
         `<summary>`: a button nested in the disclosure's own toggle control is
         unreachable for assistive technology. -->
    <div class={cm.flex({ align: 'start', gap: 'sm' })}>
      <details
        class={cm.cn(cm.flex1)}
        open={delivery.id === selectedId}
        ontoggle={() => onSelect?.(delivery)}
      >
        <summary
          class={cm.cn(
            cm.flex({ align: 'center', gap: 'sm' }),
            cm.sp('py', 1),
            cm.sp('px', 2),
            cm.textSize('xs'),
            cm.cursorPointer,
          )}
          ><span use:reactStyle={{ width: '80px', opacity: '0.7' }}
            >{#if typeof timestamp === 'function'}{@render timestamp()}{:else if timestamp !== ''}{timestamp}{/if}</span
          ><span
            class={cm.cn(cm.bgTone(statusTone(delivery.status)), cm.textOnTone)}
            use:reactStyle={{
              'min-width': '70px',
              'text-align': 'center',
              padding: '0px 6px',
              'border-radius': '4px',
              'font-weight': '700',
            }}>{delivery.statusCode}</span
          ><span
            id={retryable ? eventTypeId : undefined}
            class={cm.cn(cm.fontWeight('semibold'), cm.flex1)}>{delivery.eventType}</span
          >{#if delivery.attempt !== undefined}<span>{'#' + delivery.attempt}</span
            >{/if}{#if delivery.durationMs !== undefined}<span>{delivery.durationMs + 'ms'}</span
            >{/if}</summary
        >
        <div class={cm.cn(cm.sp('p', 3), cm.stack(2))}>
          {#if delivery.requestBody !== undefined}
            {@const requestText = stringify(delivery.requestBody)}
            <div class={cm.stack(1)}>
              <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{requestLabel}</span
              >
              <pre
                class={cm.textSize('xs')}
                use:reactStyle={{
                  overflowX: 'auto',
                }}>{#if requestText !== ''}{requestText}{/if}</pre>
            </div>
          {/if}
          {#if delivery.responseBody !== undefined}
            {@const responseText = stringify(delivery.responseBody)}
            <div class={cm.stack(1)}>
              <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
                >{responseLabel}</span
              >
              <pre
                class={cm.textSize('xs')}
                use:reactStyle={{
                  overflowX: 'auto',
                }}>{#if responseText !== ''}{responseText}{/if}</pre>
            </div>
          {/if}
        </div>
      </details>
      {#if retryable}
        <span class={cm.sp('py', 1)}>
          <button
            type="button"
            data-mol-id="webhook-inspector-retry"
            aria-describedby={eventTypeId}
            class={cm.cn(
              cm.button({ variant: 'solid', color: 'primary', size: 'xs' }),
              cm.touchTargetCompact,
            )}
            onclick={() => onRetry?.(delivery)}>{retryLabel}</button
          >
        </span>
      {/if}
    </div>
  {/each}
</div>
