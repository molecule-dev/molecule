import type { AngularTranslations } from './types.js'

/** Angular translations for Slovak. */
export const sk: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider musí byť použitý vnútri ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient sa musí použiť v rámci AuthProvider',
  'angular.error.oauthFailed': 'Prihlásenie cez OAuth zlyhalo',
  'angular.error.unsupportedMethod': 'Nepodporovaná metóda: {{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider sa musí použiť v rámci StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider musí byť použitý vnútri EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient musí byť použitý vnútri HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider musí byť použitý vnútri LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider musí byť použitý vnútri PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Žiadny smerovač tu nie je. Pridajte `provideMoleculeRouter()` z smerovacej väzby (`@molecule/app-routing-angular-router`) k poskytovateľom aplikácie za Angular `provideRouter(routes)` alebo odovzdajte `router` do `provideMolecule`.',
  'angular.error.noRoutedView':
    'Táto smerovacia väzba nemá žiadny smerovaný pohľad na vykreslenie: namiesto toho odovzdajte stránku ako deti.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider musí byť použitý vnútri StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider musí byť použitý vnútri ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider musí byť použitý vnútri WorkspaceProvider',
}
