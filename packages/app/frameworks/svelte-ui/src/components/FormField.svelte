<!--
  FormField: label + child + error/hint wiring.

  React injects id / aria-describedby / aria-invalid onto a single element
  child via cloneElement. Snippets cannot be cloned, so this component applies
  the same injection to the single rendered child's form-control element after
  render: an id the child did not set itself (a generated or name-derived id)
  is replaced by the field's id, an existing aria-describedby is appended to,
  and aria-invalid is set when the field has an error.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { useGeneratedId } from '../dom.js'
  import { reactStyle } from '../style.js'
  import type { FormFieldProps } from '../types.js'

  let { children, label, name, error, hint, required, className, style, testId }: FormFieldProps =
    $props()

  const cm = $derived(getClassMap())
  const generatedId = useGeneratedId()
  const fieldId = $derived(name || generatedId)
  const errorId = $derived(`${fieldId}-error`)
  const hintId = $derived(`${fieldId}-hint`)
  const describedBy = $derived(error ? errorId : hint ? hintId : undefined)

  let rootEl = $state<HTMLDivElement | null>(null)
  let labelEl = $state<HTMLLabelElement | null>(null)
  let errorEl = $state<HTMLParagraphElement | null>(null)
  let hintEl = $state<HTMLParagraphElement | null>(null)

  $effect(() => {
    if (!rootEl || !children) return
    // The nodes the children snippet contributed: everything this component
    // did not render itself (its own label and message paragraphs are bound).
    const contributed = Array.from(rootEl.children).filter(
      (el) => el !== labelEl && el !== errorEl && el !== hintEl,
    )
    if (contributed.length !== 1 || contributed[0]!.nodeType !== 1) return
    // A raw control element contributes itself; a component child (Input,
    // Select, …) contributes its wrapper, whose control is a descendant.
    const only = contributed[0]! as HTMLElement
    const control = only.matches('input, select, textarea')
      ? only
      : only.querySelector<HTMLElement>('input, select, textarea')
    if (!control) return
    const explicit =
      control.id && control.id !== control.getAttribute('name') && !control.id.startsWith('mol-s')
    const finalId = explicit ? control.id : fieldId
    control.id = finalId
    if (labelEl) labelEl.htmlFor = finalId
    if (describedBy) {
      const existing = control.getAttribute('aria-describedby')
      control.setAttribute('aria-describedby', [existing, describedBy].filter(Boolean).join(' '))
    }
    if (error) control.setAttribute('aria-invalid', 'true')
  })
</script>

<div
  bind:this={rootEl}
  class={cm.cn(cm.inputWrapper, cm.sp('mb', 4), className)}
  use:reactStyle={style}
  data-testid={testId}
>
  {#if label}
    <label
      bind:this={labelEl}
      for={fieldId}
      class={cm.cn(cm.label({ required: !!required }), cm.labelBlock)}>{label}</label
    >
  {/if}
  {@render children?.()}
  {#if error}
    <p bind:this={errorEl} id={errorId} class={cm.formError}>{error}</p>
  {/if}
  {#if hint && !error}
    <p bind:this={hintEl} id={hintId} class={cm.formHint}>{hint}</p>
  {/if}
</div>
