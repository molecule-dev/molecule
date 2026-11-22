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
    'Мұнда маршрутизатор жоқ. Angular-дың `provideRouter(routes)` кейін қолданба провайдерлеріне бағыттау байланысынан (`@molecule/app-routing-angular-router`) `provideMoleculeRouter()` қосыңыз немесе `router` ды `provideMolecule` ке беріңіз. Егер қолданба мұны бұрыннан жасаса, оның бағыттау байланысы бұл байланыстырудан ескі: оны жаңартыңыз (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Бұл бағыттау байланысының мұнда көрсетуге арналған бағыттау көрінісі жоқ: оның орнына бетті бала ретінде беріңіз. Егер қолданба `@molecule/app-routing-angular-router` арқылы бағыттаса, бұл байланыс осы байланыстырудан ескірек: оны жаңартыңыз (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider StorageProvider ішінде пайдаланылуы керек',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider ThemeProvider ішінде пайдаланылуы керек',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider WorkspaceProvider ішінде пайдаланылуы керек',
}
