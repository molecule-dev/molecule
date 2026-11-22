import type { AngularTranslations } from './types.js'

/** Angular translations for Kazakh. */
export const kk: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider ChatProvider ішінде пайдаланылуы керек',
  'angular.error.useAuthOutsideProvider': 'useAuthClient AuthProvider ішінде пайдаланылуы керек',
  'angular.error.oauthFailed': 'OAuth кіру сәтсіз аяқталды',
  'angular.error.unsupportedMethod': 'Қолдау көрсетілмейтін әдіс: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider StateProvider ішінде пайдаланылуы керек',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider EditorProvider ішінде пайдаланылуы керек',
  'angular.error.useHttpOutsideProvider': 'useHttpClient HttpProvider ішінде пайдаланылуы керек',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider LoggerProvider ішінде пайдаланылуы керек',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider PreviewProvider ішінде пайдаланылуы керек',
  'angular.error.useRouterOutsideProvider':
    'Мұнда маршрутизатор жоқ. Angular-дың `provideRouter(routes)` кейін қолданба провайдерлеріне маршруттау байланысынан (`@molecule/app-routing-angular-router`) `provideMoleculeRouter()` қосыңыз немесе `router` ды `provideMolecule` ке беріңіз.',
  'angular.error.noRoutedView':
    'Бұл бағыттау байланысының мұнда көрсетуге болатын бағыттау көрінісі жоқ: оның орнына бетті бала ретінде беріңіз.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider ішінде пайдаланылуы керек',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider ThemeProvider ішінде пайдаланылуы керек',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider ішінде пайдаланылуы керек',
}
