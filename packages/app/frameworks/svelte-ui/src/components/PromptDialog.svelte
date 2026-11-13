<!--
  PromptDialog: the shared "ask for a short string" modal replacing
  window.prompt. onSubmit receives the RAW entered value; resolve closes and
  resets the dialog, reject/throw keeps it open with the value intact. While
  the promise is pending the input and both buttons are disabled. Enter
  submits; Escape and the backdrop cancel exactly like a Modal.
-->
<script lang="ts">
  import { untrack } from 'svelte'

  import { getClassMap } from '@molecule/app-ui'

  import { useI18n } from '../framework.js'
  import type { PromptDialogProps } from '../types.js'
  import Button from './Button.svelte'
  import Input from './Input.svelte'
  import Modal from './Modal.svelte'
  import ReactNode from './ReactNode.svelte'

  let {
    open,
    onClose,
    title,
    description,
    placeholder,
    initialValue = '',
    onSubmit,
    confirmLabel,
    cancelLabel,
    destructive = false,
    inputMolId,
    confirmMolId,
    cancelMolId,
    children,
  }: PromptDialogProps = $props()

  const { t } = useI18n()
  const cm = $derived(getClassMap())
  // Re-seed from initialValue each open so a reopened dialog shows the
  // CURRENT value, not whatever the user typed last time.
  let value = $state(untrack(() => initialValue))
  let pending = $state(false)
  let titleEl = $state<HTMLHeadingElement | null>(null)
  // React names the input with the title when it is a plain string, else the
  // placeholder. A Svelte title is a snippet, so the string case is detected
  // after it renders: exactly one text node under the heading. The opening
  // label is deliberately seeded ONCE from placeholder; the effect below
  // re-derives it from the rendered title, so `untrack` states that the
  // initial read is intentional.
  let inputLabel = $state<string | undefined>(untrack(() => placeholder))

  $effect(() => {
    if (open) {
      value = initialValue
      pending = false
    }
  })

  $effect(() => {
    void title
    void open
    // Comment anchors and empty placeholder text nodes are Svelte bookkeeping,
    // not content: what remains is what the snippet actually rendered.
    const nodes = Array.from(titleEl?.childNodes ?? []).filter(
      (n) => n.nodeType !== 8 && (n.nodeType !== 3 || (n.textContent ?? '') !== ''),
    )
    const text =
      nodes.length === 1 && nodes[0] && nodes[0].nodeType === 3 ? nodes[0].textContent : ''
    inputLabel = text || placeholder
  })

  const handleSubmit = (e: SubmitEvent): void => {
    e.preventDefault()
    if (pending) return
    pending = true
    void Promise.resolve(onSubmit(value))
      .then(() => {
        // A parent that keeps the dialog open (a multi-stage flow advancing
        // in onClose) gets a form that accepts the next submit.
        pending = false
        onClose()
      })
      .catch((_error) => {
        // Deliberate: a rejection keeps the dialog open (the caller renders
        // the error through children); the value stays intact.
        pending = false
      })
  }
</script>

<Modal {open} onClose={pending ? () => undefined : onClose}>
  <form onsubmit={handleSubmit}>
    <div class={cm.stack(3)}>
      <h2 bind:this={titleEl} class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
        <ReactNode node={title} />
      </h2>
      {#if description}<p class={cm.textSize('sm')}><ReactNode node={description} /></p>{/if}
      <Input
        {value}
        onChange={(e) => {
          value = (e.target as HTMLInputElement).value
        }}
        {placeholder}
        aria-label={inputLabel}
        disabled={pending}
        autoFocus
        data-mol-id={inputMolId}
      />
      {@render children?.()}
      <div class={cm.flex({ justify: 'end', gap: 'sm' })}>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={pending}
          data-mol-id={cancelMolId}
        >
          {#if cancelLabel}<ReactNode node={cancelLabel} />{:else}{$t(
              'prompt.cancel',
              {},
              { defaultValue: 'Cancel' },
            )}{/if}
        </Button>
        <Button
          type="submit"
          variant="solid"
          color={destructive ? 'error' : 'primary'}
          disabled={pending}
          data-mol-id={confirmMolId}
        >
          {#if confirmLabel}<ReactNode node={confirmLabel} />{:else}{$t(
              'prompt.confirm',
              {},
              { defaultValue: 'Confirm' },
            )}{/if}
        </Button>
      </div>
    </div>
  </form>
</Modal>
