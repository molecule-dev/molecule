import type { AngularTranslations } from './types.js'

/** Angular translations for af. */
export const af: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    "useChatProvider moet binne 'n ChatProvider gebruik word.",
  'angular.error.useAuthOutsideProvider': "useAuthClient moet binne 'n AuthProvider gebruik word",
  'angular.error.oauthFailed': 'OAuth-aanmelding het misluk',
  'angular.error.unsupportedMethod': 'Nie-ondersteunde metode: {{method}}',
  'angular.error.useStoreOutsideProvider':
    "useStateProvider moet binne 'n StateProvider gebruik word.",

  'angular.error.useEditorOutsideProvider':
    "useEditorProvider moet binne 'n EditorProvider gebruik word.",
  'angular.error.useHttpOutsideProvider': "useHttpClient moet binne 'n HttpProvider gebruik word",
  'angular.error.useLoggerOutsideProvider':
    "useLoggerProvider moet binne 'n LoggerProvider gebruik word",
  'angular.error.usePreviewOutsideProvider':
    "usePreviewProvider moet binne 'n PreviewProvider gebruik word",
  'angular.error.useRouterOutsideProvider':
    'Geen router hier nie. Voeg `provideMoleculeRouter()` vanaf die roeteringsbinding (`@molecule/app-routing-angular-router`) by die toepassing se verskaffers, na Angular se `provideRouter(routes)`, of gee `router` deur aan `provideMolecule`. As die toepassing dit reeds doen, is die roeteringsbinding ouer as hierdie binding: werk dit op (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Hierdie roeteringsbinding het geen gerouteerde aansig om hier te lewer nie: gee die bladsy eerder as kinders deur. As die toepassing met `@molecule/app-routing-angular-router` roeteer, is daardie binding ouer as hierdie binding: werk dit op (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    "useStorageProvider moet binne 'n StorageProvider gebruik word.",
  'angular.error.useThemeOutsideProvider':
    "useThemeProvider moet binne 'n Temaverskaffer gebruik word",
  'angular.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider moet binne 'n Werkruimteverskaffer gebruik word.",
}
