<!--
  AmountInput: the Svelte counterpart of `@molecule/app-amount-input-react`'s
  `AmountInput` — large currency input with an optional income/expense toggle.
  Same props (React names), same ClassMap tokens, same DOM for the same input:
  the input's value is applied through both the property and the attribute the
  way React's is (see `value.ts`), and every visible string goes through `t()`
  so a locale switch re-renders it.
-->
<script lang="ts">
  import { useTranslation } from '@molecule/app-svelte'
  import { getClassMap } from '@molecule/app-ui'
  import { Button } from '@molecule/app-ui-svelte'

  import type { AmountInputProps, AmountType } from './types.js'
  import { reactInputValue } from './value.js'

  let {
    amount,
    onAmountChange,
    type,
    onTypeChange,
    typeOptions = ['income', 'expense'],
    typeLabels,
    currencySymbol = '$',
    ariaLabel,
    size = 'lg',
    className,
  }: AmountInputProps = $props()

  const cm = $derived(getClassMap())
  const { t } = useTranslation()

  /** The text the controlled input shows (React's `amount === '' ? '' : String(amount)`). */
  const amountText = $derived(amount === '' ? '' : String(amount))

  /** The size token React picks for the current size. */
  const fontClass = $derived(
    size === 'xl' ? cm.textSize('5xl') : size === 'lg' ? cm.textSize('4xl') : cm.textSize('2xl'),
  )

  /** The numeric input's accessible name (prop > `t()` > English default). */
  const amountLabel = $derived(
    ariaLabel ?? t('amountInput.ariaLabel', undefined, { defaultValue: 'Amount' }),
  )

  /**
   * The input's inline style, as React writes it. A variable reference (not a
   * literal) so Svelte applies it through the CSSOM; a compiled-in string
   * would serialize differently from React's.
   */
  const INPUT_STYLE: Record<'border' | 'outline' | 'background' | 'flex', string> = {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    flex: '1',
  }

  /**
   * The translated label for one amount type. Each type goes to its own
   * literal key — `amountInput.type.<value>` — so the i18n parity gate can
   * see every key this component can request.
   * @param option - The amount type.
   * @returns The label text.
   */
  function typeLabel(option: AmountType): string {
    switch (option) {
      case 'income':
        return t('amountInput.type.income', undefined, { defaultValue: 'Income' })
      case 'expense':
        return t('amountInput.type.expense', undefined, { defaultValue: 'Expense' })
      case 'transfer':
        return t('amountInput.type.transfer', undefined, { defaultValue: 'Transfer' })
      case 'other':
        return t('amountInput.type.other', undefined, { defaultValue: 'Other' })
    }
  }

  /** One label per toggle option (prop > `t()` > English default). */
  const labels = $derived(typeOptions.map((option) => typeLabels?.[option] ?? typeLabel(option)))

  /**
   * Parses the raw field text and reports it, then restores the controlled
   * value exactly as react-dom does after an input event (the DOM value
   * follows the current `amount` prop until a parent renders a new one).
   *
   * @param event - The native input event.
   */
  function handleInput(event: Event): void {
    const input = event.target as HTMLInputElement
    const raw = input.value.replace(/[^0-9.-]/g, '')
    if (raw === '' || raw === '-') onAmountChange('')
    else {
      const parsed = Number(raw)
      if (Number.isFinite(parsed)) onAmountChange(parsed)
    }
    if (input.value !== amountText) input.value = amountText
    if (input.getAttribute('value') !== amountText) input.setAttribute('value', amountText)
  }
</script>

<div class={cm.cn(cm.stack(3), className)}>
  {#if onTypeChange}
    <div class={cm.flex({ align: 'center', gap: 'xs' })}>
      {#each typeOptions as option, index (option)}
        <Button
          type="button"
          variant={type === option ? 'solid' : 'ghost'}
          color={type === option ? 'primary' : undefined}
          size="sm"
          onClick={() => onTypeChange?.(option)}
        >
          {labels[index]}
        </Button>
      {/each}
    </div>
  {/if}
  <div class={cm.flex({ align: 'baseline', gap: 'xs' })}>
    <span class={cm.cn(fontClass, cm.fontWeight('bold'))}>{currencySymbol}</span>
    <input
      type="text"
      inputmode="decimal"
      use:reactInputValue={{ value: amountText }}
      oninput={handleInput}
      placeholder="0"
      aria-label={amountLabel}
      class={cm.cn(fontClass, cm.fontWeight('bold'))}
      style:border={INPUT_STYLE.border}
      style:outline={INPUT_STYLE.outline}
      style:background={INPUT_STYLE.background}
      style:flex={INPUT_STYLE.flex}
    />
  </div>
</div>
