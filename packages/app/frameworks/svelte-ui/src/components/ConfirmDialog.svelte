<!--
  ConfirmDialog: the shared "Are you sure?" modal. Cancel/Confirm fall back
  to the confirm.* i18n keys; destructive (default true) only switches the
  confirm button color. Does not track onConfirm's promise and does not
  close itself on confirm.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import { contentPresence } from '../content-presence.js'
  import { useGeneratedId } from '../dom.js'
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
  // A title or description that renders nothing (React's `slot(title)`) names
  // nothing, so the dialog then points at no heading/description. A snippet's
  // value cannot say that (`{#each}` over no rows), so the rendered content
  // is measured instead.
  let titleRenders = $state(false)
  let descriptionRenders = $state(false)
  const reportTitle = (renders: boolean): void => {
    titleRenders = renders
  }
  const reportDescription = (renders: boolean): void => {
    descriptionRenders = renders
  }
  // Attachments measure client content. On the server, associate the supplied
  // title and description with their rendered elements on the first pass.
  const server = typeof document === 'undefined'
  const hasSuppliedNode = (node: typeof title): boolean =>
    typeof node === 'string' ? node.trim().length > 0 : node != null
  const headingId = $derived(
    titleRenders || (server && hasSuppliedNode(title)) ? titleId : undefined,
  )
  const describedById = $derived(
    descriptionRenders || (server && hasSuppliedNode(description)) ? descriptionId : undefined,
  )
</script>

<Modal {open} {onClose} aria-labelledby={headingId} aria-describedby={describedById}>
  <div class={cm.stack(3)}>
    <h2
      id={headingId}
      {@attach contentPresence(reportTitle)}
      class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}
    >
      <ReactNode node={title} />
    </h2>
    <p id={descriptionId} {@attach contentPresence(reportDescription)} class={cm.textSize('sm')}>
      <ReactNode node={description} />
    </p>
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
