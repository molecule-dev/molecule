/** Translation keys for the presence-indicator locale package. */
export type PresenceIndicatorTranslationKey =
  | 'presenceIndicator.aria.presence'
  | 'presenceIndicator.status.online'
  | 'presenceIndicator.status.away'
  | 'presenceIndicator.status.busy'
  | 'presenceIndicator.status.offline'

/** Translation record mapping `@molecule/app-presence-indicator-react` keys to translated strings. */
export type PresenceIndicatorTranslations = Record<PresenceIndicatorTranslationKey, string>
