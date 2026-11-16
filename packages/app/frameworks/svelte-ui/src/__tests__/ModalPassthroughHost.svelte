<!--
  Test host for the Modal pass-through-update test: renders an open Modal
  whose `aria-label` / `data-*` come from `$state` (mode `state`), or whose
  `aria-label` is a translated string (mode `locale`).
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'

  import Modal from '../components/Modal.svelte'

  let { mode = 'state' }: { mode?: 'state' | 'locale' } = $props()

  let label = $state('First label')
  let state = $state('one')
  const { t } = useTranslation()

  const stateAttrs = $derived({ 'aria-label': label, 'data-state': state })
  const localeAttrs = $derived({
    'aria-label': t('modalPassthrough.label', undefined, { defaultValue: 'fallback' }),
  })
</script>

{#if mode === 'state'}
  <button
    type="button"
    data-change
    onclick={() => {
      label = 'Second label'
      state = 'two'
    }}
  >
    change
  </button>
  <Modal open onClose={() => undefined} title="State" {...stateAttrs}>body</Modal>
{:else}
  <Modal open onClose={() => undefined} title="Locale" {...localeAttrs}>body</Modal>
{/if}
