/** Translation keys for the integration-card locale package. */
export type IntegrationCardTranslationKey =
  | 'integrationCard.status.connected'
  | 'integrationCard.status.disconnected'
  | 'integrationCard.status.error'
  | 'integrationCard.status.pending'

/** Translation record mapping `@molecule/app-integration-card-react` keys to translated strings. */
export type IntegrationCardTranslations = Record<IntegrationCardTranslationKey, string>
