<!--
  ConfirmDialog: the shared "Are you sure?" modal. Cancel/Confirm fall back
  to the confirm.* i18n keys; destructive (default true) only switches the
  confirm button color. Does not track onConfirm's promise and does not
  close itself on confirm.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { useGeneratedId } from '../dom.js'
  import { rendersNode } from '../node.js'
  import type { ConfirmDialogProps } from '../types.js'
  import Button from './Button.svelte'
  import Modal from './Modal.svelte'
  import ReactNode from './ReactNode.svelte'

  let {
    open,
    onClose,
    title,
    description,
    confirmLabel,
    cancelLabel,
    onConfirm,
    destructive = true,
    children,
    loading,
  }: ConfirmDialogProps = $props()

  const { t } = useTranslation()
  const cm = $derived(getClassMap())
  // The dialog names itself with its visible title and, when rendered, its
  // description (WAI-ARIA dialog pattern): the ids reach the dialog element
  // through Modal's `aria-*` pass-through, so screen readers announce the
  // title and description instead of an unnamed dialog (axe
  // `aria-dialog-name`).
  const titleId = useGeneratedId()
  const descriptionId = useGeneratedId()
  // A title that renders nothing (React's `slot(title)`) names nothing, so the
  // dialog then points at no heading.
  const headingId = $derived(rendersNode(title) ? titleId : undefined)
  const hasDescription = $derived(rendersNode(description))
</script>

<Modal
  {open}
  {onClose}
  aria-labelledby={headingId}
  aria-describedby={hasDescription ? descriptionId : undefined}
>
  <div class={cm.stack(3)}>
    <h2 id={headingId} class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}>
      <ReactNode node={title} />
    </h2>
    <p id={descriptionId} class={cm.textSize('sm')}><ReactNode node={description} /></p>
    {@render children?.()}
    <div class={cm.flex({ justify: 'end', gap: 'sm' })}>
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        {#if cancelLabel}<ReactNode node={cancelLabel} />{:else}{t(
            'confirm.cancel',
            {},
            { defaultValue: 'Cancel' },
          )}{/if}
      </Button>
      <Button
        variant="solid"
        color={destructive ? 'error' : 'primary'}
        onClick={() => void onConfirm()}
        disabled={loading}
      >
        {#if loading}…{:else if confirmLabel}<ReactNode node={confirmLabel} />{:else}{t(
            'confirm.confirm',
            {},
            { defaultValue: 'Confirm' },
          )}{/if}
      </Button>
    </div>
  </div>
</Modal>
