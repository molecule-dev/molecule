/** Translation keys for the oauth-buttons locale package. */
export type OAuthButtonsTranslationKey =
  | 'oauthButtons.groupLabel'
  | 'oauthButtons.continueWith'
  | 'oauthButtons.provider.github'
  | 'oauthButtons.provider.gitlab'
  | 'oauthButtons.provider.google'
  | 'oauthButtons.provider.twitter'
  | 'oauthButtons.provider.x'
  | 'oauthButtons.provider.apple'
  | 'oauthButtons.provider.facebook'
  | 'oauthButtons.provider.microsoft'
  | 'oauthButtons.provider.linkedin'
  | 'oauthButtons.provider.discord'

/** Translation record mapping oauth-buttons keys to translated strings. */
export type OAuthButtonsTranslations = Record<OAuthButtonsTranslationKey, string>
