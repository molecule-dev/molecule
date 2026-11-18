<!--
  TagInput: the Svelte counterpart of `@molecule/app-tag-input-react`'s
  `TagInput` — chips plus a text field that commits on Enter, comma, Tab and
  blur. Same props (React names), same ClassMap tokens, same DOM for the same
  input. Enter never submits an enclosing form.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'

  import TagChip from './TagChip.svelte'
  import type { TagInputProps } from './types.js'
  import { useTagInput } from './useTagInput.js'

  let { value, onChange, placeholder, normalize, maxTags, className }: TagInputProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()
  // A getter, so the actions read the component's latest props: the hook runs
  // once, like React's hook across re-renders.
  const { draft, inputProps, remove } = useTagInput(() => ({
    value,
    onChange,
    normalize,
    maxTags,
  }))

  const wrapperClass = $derived(
    cm.cn(cm.flex({ align: 'center', gap: 'xs', wrap: 'wrap' }), cm.sp('p', 2), className),
  )
  const inputClass = $derived(cm.cn(cm.flex1, cm.input()))
  const placeholderText = $derived(
    placeholder ?? t('tagInput.placeholder', {}, { defaultValue: 'Add a tag…' }),
  )

  let field: HTMLInputElement | undefined = $state()

  // React's controlled input writes BOTH the `value` attribute and the live
  // property; `value={$draft}` covers the property, and this effect mirrors it
  // onto the attribute so the DOM reads the same.
  $effect(() => {
    const text = $draft
    if (field && field.getAttribute('value') !== text) field.setAttribute('value', text)
  })
</script>

<div class={wrapperClass}>
  {#each value as tag, i (`${tag}-${i}`)}
    <TagChip onRemove={() => remove(i)}>{tag}</TagChip>
  {/each}
  <input
    bind:this={field}
    type="text"
    value={$draft}
    oninput={$inputProps.onChange}
    onkeydown={$inputProps.onKeyDown}
    onfocusout={$inputProps.onBlur}
    placeholder={placeholderText}
    class={inputClass}
  />
</div>
