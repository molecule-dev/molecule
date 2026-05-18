/** Translation keys for the settings-panel-react locale package. */
export type SettingsPanelTranslationKey =
  | 'settings.appearance'
  | 'settings.darkMode'
  | 'theme.toggle'
  | 'settings.logOut'
  | 'settings.deleteAccount'
  | 'settings.billing.checkoutFailed'
  | 'settings.billing.cancelConfirm'
  | 'settings.billing.cancelFailed'
  | 'settings.billing'
  | 'settings.plan'
  | 'settings.upgrade'
  | 'settings.billing.cancel'
  | 'settings.billing.upgradeTitle'
  | 'settings.billing.noTiers'
  | 'settings.billing.subscribe'

/** Translation record mapping settings-panel-react keys to translated strings. */
export type SettingsPanelTranslations = Record<SettingsPanelTranslationKey, string>
