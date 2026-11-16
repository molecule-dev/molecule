/** Translation keys for the amount-input locale package. */
export type AmountInputTranslationKey =
  | 'amountInput.ariaLabel'
  | 'amountInput.type.income'
  | 'amountInput.type.expense'
  | 'amountInput.type.transfer'
  | 'amountInput.type.other'

/** Translation record mapping `@molecule/app-amount-input-react` keys to translated strings. */
export type AmountInputTranslations = Record<AmountInputTranslationKey, string>
