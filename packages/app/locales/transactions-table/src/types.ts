/** Translation keys for the transactions-table locale package. */
export type TransactionsTableTranslationKey =
  | 'transactionsTable.header.date'
  | 'transactionsTable.header.description'
  | 'transactionsTable.header.category'
  | 'transactionsTable.header.account'
  | 'transactionsTable.header.amount'
  | 'transactionsTable.label.retry'

/** Translation record mapping `@molecule/app-transactions-table-react` keys to translated strings. */
export type TransactionsTableTranslations = Record<TransactionsTableTranslationKey, string>
