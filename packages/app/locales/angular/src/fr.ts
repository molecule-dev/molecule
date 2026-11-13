import type { AngularTranslations } from './types.js'

/** Angular translations for fr. */
export const fr: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    "La fonction useChatProvider doit être utilisée au sein d'un ChatProvider.",
  'angular.error.useAuthOutsideProvider':
    "La méthode useAuthClient doit être utilisée au sein d'un AuthProvider.",
  'angular.error.oauthFailed': 'Échec de la connexion OAuth',
  'angular.error.unsupportedMethod': 'Méthode non prise en charge : {{method}}',
  'angular.error.useStoreOutsideProvider':
    "useStateProvider doit être utilisé à l'intérieur d'un StateProvider.",
}
