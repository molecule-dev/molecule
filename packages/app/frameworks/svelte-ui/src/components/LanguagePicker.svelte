<!--
  LanguagePicker: globe-icon button that opens a modal grid of every locale
  registered with the bonded i18n provider. Clicking a locale calls setLocale
  and closes the modal. No hardcoded language list.
-->
<script lang="ts">
  import { getClassMap } from '@molecule/app-ui'

  import { reactAttrs, withoutEvents } from '../attrs.js'
  import { spreadEvents } from '../dom.js'
  import { useI18n } from '../framework.js'
  import { reactStyle } from '../style.js'
  import type { LanguagePickerProps } from '../types.js'
  import Icon from './Icon.svelte'
  import Modal from './Modal.svelte'

  let {
    labelKey = 'footer.language',
    labelDefault = 'Language',
    modalTitleKey = 'languagePicker.modalTitle',
    modalTitleDefault = 'Choose language',
    icon = 'globe',
    iconSize = 16,
    display = 'name',
    className,
    renderTrigger,
    style,
    ...rest
  }: LanguagePickerProps = $props()

  const { t, locale, locales, setLocale } = useI18n()
  const cm = $derived(getClassMap())
  let open = $state(false)

  const ariaLabel = $derived($t(labelKey, {}, { defaultValue: labelDefault }))
  const current = $derived($locales.find((l) => l.code === $locale))
  const currentName = $derived(current?.name ?? $locale)
  const triggerLabel = $derived(
    display === 'icon' ? null : display === 'code' ? $locale : currentName,
  )
</script>

{#if renderTrigger}
  {@render renderTrigger(() => (open = true))}
{:else}
  <button
    type="button"
    data-mol-id="language-picker-trigger"
    aria-label={ariaLabel}
    onclick={() => (open = true)}
    class={cm.cn(cm.languagePickerTrigger, className)}
    use:reactStyle={style}
    {...reactAttrs(withoutEvents(rest))}
    use:spreadEvents={rest}
  >
    <Icon name={icon} size={iconSize} />
    {#if triggerLabel != null}<span>{triggerLabel}</span>{/if}
  </button>
{/if}
<Modal
  {open}
  onClose={() => (open = false)}
  title={$t(modalTitleKey, {}, { defaultValue: modalTitleDefault })}
  size="lg"
  data-mol-id="language-picker-modal"
>
  <div class={cm.languageGrid}>
    {#each [...$locales].sort((a, b) => a.name.localeCompare(b.name)) as l (l.code)}
      {@const active = l.code === $locale}
      <button
        type="button"
        data-mol-id={`language-picker-option-${l.code}`}
        data-active={active || undefined}
        aria-pressed={active}
        onclick={async () => {
          await setLocale(l.code)
          open = false
        }}
        class={active ? cm.languageActive : cm.languageOption}
      >
        {l.name}
      </button>
    {/each}
  </div>
</Modal>
