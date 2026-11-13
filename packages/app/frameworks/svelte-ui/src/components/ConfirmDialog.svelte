<!--
  ConfirmDialog: the shared "Are you sure?" modal. Cancel/Confirm fall back
  to the confirm.* i18n keys; destructive (default true) only switches the
  confirm button color. Does not track onConfirm's promise and does not
  close itself on confirm.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { useI18n } from '../framework.js'
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

  const { t } = useI18n()
  const cm = $derived(getClassMap())
</script>

<Modal {open} {onClose}>
  <div class={cm.stack(3)}>
    <h2 class={cm.cn(cm.textSize('lg'), cm.fontWeight('bold'))}><ReactNode node={title} /></h2>
    <p class={cm.textSize('sm')}><ReactNode node={description} /></p>
    {@render children?.()}
    <div class={cm.flex({ justify: 'end', gap: 'sm' })}>
      <Button variant="ghost" onClick={onClose} disabled={loading}>
        {#if cancelLabel}<ReactNode node={cancelLabel} />{:else}{$t(
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
        {#if loading}…{:else if confirmLabel}<ReactNode node={confirmLabel} />{:else}{$t(
            'confirm.confirm',
            {},
            { defaultValue: 'Confirm' },
          )}{/if}
      </Button>
    </div>
  </div>
</Modal>
