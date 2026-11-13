import type { AngularTranslations } from './types.js'

/** Angular translations for Russian. */
export const ru: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider должен использоваться внутри ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'Метод useAuthClient необходимо использовать внутри AuthProvider.',
  'angular.error.oauthFailed': 'Не удалось выполнить вход через OAuth.',
  'angular.error.unsupportedMethod': 'Неподдерживаемый метод: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'Метод useStateProvider должен использоваться внутри StateProvider.',
}
