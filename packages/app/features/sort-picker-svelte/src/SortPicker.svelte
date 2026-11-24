<!--
  SortPicker: the Svelte counterpart of `@molecule/app-sort-picker-react`'s
  `SortPicker` — a single-select sort menu wrapped in a conventional "Sort by"
  label, inline or above. Same props (React names) and same DOM for the same
  input; a node-valued `label` arrives as a snippet.
-->
<script lang="ts">
  import type { Attachment } from 'svelte/attachments'

  import { contentNodes, useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Select } from '@molecule/app-ui-svelte'

  import type { SortPickerProps } from './types.js'

  let {
    value,
    onChange,
    options,
    label,
    ariaLabel,
    labelPosition = 'inline',
    className,
  }: SortPickerProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  const defaultLabel = $derived(t('sort.label', {}, { defaultValue: 'Sort by' }))
  const labelSnippet = $derived(typeof label === 'function' ? label : undefined)
  const labelText = $derived(typeof label === 'string' ? label : defaultLabel)
  // A node can never be an aria-label attribute value, so resolve a plain
  // string: an explicit `ariaLabel`, else the label when it is a string, else
  // the translated default. Never `String()` a node.
  const selectAriaLabel = $derived(ariaLabel ?? labelText)

  // React's `slot(label) ?? defaultLabel`: a label snippet that renders nothing is absent, so the
  // default text shows. A snippet's `{#each}` over no rows changes the DOM without changing the
  // prop, so presence follows the rendered content (the trailing colon in inline mode counts as
  // the component's own, not the label's).
  let labelRenders = $state(false)
  const trackLabel: Attachment<HTMLElement> = (element) => {
    const sync = (): void => {
      const base = labelPosition === 'above' ? 0 : 1
      labelRenders = contentNodes(element).length > (labelRenders ? base : base + 1)
    }
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(element, { childList: true, characterData: true, subtree: true })
    return () => observer.disconnect()
  }

  /**
   * Reports a picked option through the `onChange` callback.
   *
   * @param next - The selected option value.
   */
  const handleValueChange = (next: string): void => onChange(next)
</script>

{#if labelPosition === 'above'}
  <!-- The span and the select abut with no whitespace between them: a newline
       there becomes a text node, and inside the flex wrapper that text node
       draws a space React never renders. -->
  <div class={cm.cn(cm.stack(1), className)}>
    <span {@attach trackLabel} class={cm.cn(cm.textSize('xs'), cm.fontWeight('semibold'))}
      >{#if labelSnippet}{@render labelSnippet?.()}{/if}{#if !labelSnippet || !labelRenders}{labelText}{/if}</span
    ><Select {options} {value} onValueChange={handleValueChange} aria-label={selectAriaLabel} />
  </div>
{:else}
  <div class={cm.cn(cm.flex({ align: 'center', gap: 'sm' }), className)}>
    <span {@attach trackLabel} class={cm.textSize('sm')}
      >{#if labelSnippet}{@render labelSnippet?.()}{/if}{#if !labelSnippet || !labelRenders}{labelText}{/if}:</span
    ><Select {options} {value} onValueChange={handleValueChange} aria-label={selectAriaLabel} />
  </div>
{/if}
