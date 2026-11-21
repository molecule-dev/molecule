<!--
  HttpInspector: the Svelte counterpart of
  `@molecule/app-http-inspector-react`'s `HttpInspector` — a controlled HTTP
  request builder (method + URL + Send, headers key/value editor, body editor
  for methods that allow one) and a response panel (status-severity colors,
  timing, body). Same props (React names) and same DOM for the same input.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import type { ColorVariant } from '@molecule/app-ui'
  import { getClassMap } from '@molecule/app-ui'
  import { Button, Input, Select, Textarea } from '@molecule/app-ui-svelte'

  import type { HttpInspectorProps, HttpMethod } from './types.js'

  let {
    method,
    onMethodChange,
    url,
    onUrlChange,
    headers,
    onHeadersChange,
    body,
    onBodyChange,
    onSend,
    sending,
    response,
    className,
  }: HttpInspectorProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  const methods: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
  const methodOptions = methods.map((value) => ({ value, label: value }))

  // Every `t(…)` runs inside a `$derived`: it reads the i18n version under the
  // hood, so the labels re-render on a locale switch the way React's
  // render-time `t` calls do.
  const sendingText = $derived(t('httpInspector.sending', {}, { defaultValue: 'Sending…' }))
  const sendText = $derived(t('httpInspector.send', {}, { defaultValue: 'Send' }))
  const headersLabel = $derived(t('httpInspector.headers', {}, { defaultValue: 'Headers' }))
  const bodyLabel = $derived(t('httpInspector.body', {}, { defaultValue: 'Body' }))
  const addHeaderLabel = $derived(t('httpInspector.addHeader', {}, { defaultValue: 'Add header' }))
  const methodLabel = $derived(t('httpInspector.methodLabel', {}, { defaultValue: 'HTTP method' }))
  const urlLabel = $derived(t('httpInspector.urlLabel', {}, { defaultValue: 'URL' }))
  const headerPlaceholder = $derived(
    t('httpInspector.headerPlaceholder', {}, { defaultValue: 'Header' }),
  )
  const valuePlaceholder = $derived(
    t('httpInspector.valuePlaceholder', {}, { defaultValue: 'Value' }),
  )
  const showBody = $derived(method !== 'GET' && method !== 'HEAD')

  /**
   * Returns the semantic tone representing the severity of an HTTP status code:
   * the theme's success green below 300, info blue for a redirect, warning amber
   * for a client error, error red for a server error.
   *
   * @param code - The response status code.
   * @returns The badge's semantic tone.
   */
  function statusTone(code: number): ColorVariant {
    if (code < 300) return 'success'
    if (code < 400) return 'info'
    if (code < 500) return 'warning'
    return 'error'
  }

  /**
   * Updates a single header entry at index i with new key and value.
   *
   * @param i - The row index.
   * @param key - The new header key.
   * @param value - The new header value.
   */
  function setHeader(i: number, key: string, value: string): void {
    const next = [...headers]
    next[i] = { key, value }
    onHeadersChange(next)
  }
</script>

<div class={cm.cn(cm.stack(3), className)}>
  <div class={cm.flex({ align: 'center', gap: 'sm' })}>
    <!-- The options are protocol tokens (GET, POST, …): never translated, so
         the element carries HTML's own `translate="no"`. -->
    <Select
      value={method}
      onValueChange={(value: string) => onMethodChange(value as HttpMethod)}
      options={methodOptions}
      translate="no"
      aria-label={methodLabel}
    /><!-- The placeholder is an example URL — input, not prose: never translated. --><Input
      type="text"
      value={url}
      onChange={(event: Event) => onUrlChange((event.target as HTMLInputElement).value)}
      placeholder="https://api.example.com/v1/resources"
      translate="no"
      className={cm.flex1}
      aria-label={urlLabel}
    /><Button variant="solid" color="primary" onClick={() => void onSend()} disabled={sending}
      >{sending ? sendingText : sendText}</Button
    >
  </div>
  <div class={cm.stack(1 as const)}>
    <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{headersLabel}</span>
    {#each headers as header, i (i)}
      <div class={cm.flex({ align: 'center', gap: 'xs' })}>
        <Input
          type="text"
          value={header.key}
          onChange={(event: Event) =>
            setHeader(i, (event.target as HTMLInputElement).value, header.value)}
          placeholder={headerPlaceholder}
        /><Input
          type="text"
          value={header.value}
          onChange={(event: Event) =>
            setHeader(i, header.key, (event.target as HTMLInputElement).value)}
          placeholder={valuePlaceholder}
          className={cm.flex1}
        /><Button
          variant="ghost"
          size="sm"
          onClick={() => onHeadersChange(headers.filter((_, j) => j !== i))}>×</Button
        >
      </div>
    {/each}
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onHeadersChange([...headers, { key: '', value: '' }])}
      >+ {addHeaderLabel}</Button
    >
  </div>
  {#if showBody}
    <div class={cm.stack(1 as const)}>
      <span class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}>{bodyLabel}</span>
      <!-- The placeholder is a JSON example — input, not prose: never translated. -->
      <Textarea
        value={body}
        onChange={(event: Event) => onBodyChange((event.target as HTMLTextAreaElement).value)}
        rows={6}
        placeholder={'{"key": "value"}'}
        translate="no"
      />
    </div>
  {/if}
  {#if response}
    <div class={cm.stack(2)}>
      <div class={cm.flex({ align: 'center', gap: 'sm' })}>
        <span
          class={cm.cn(cm.bgTone(statusTone(response.statusCode)), cm.textOnTone)}
          style="padding: 2px 8px; border-radius: 4px; font-weight: 700"
          >{response.statusCode} {response.statusText ?? ''}</span
        >{#if response.durationMs !== undefined}<span class={cm.textSize('xs')}
            >{response.durationMs}ms</span
          >{/if}
      </div>
      <pre
        class={cm.cn(cm.sp('p', 3), cm.textSize('xs'))}
        style="overflow-x: auto">{#if response.body !== ''}{response.body}{/if}</pre>
    </div>
  {/if}
</div>
