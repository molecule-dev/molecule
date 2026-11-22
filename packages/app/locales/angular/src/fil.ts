import type { AngularTranslations } from './types.js'

/** Angular translations for Filipino. */
export const fil: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'Ang useChatProvider ay dapat gamitin sa loob ng ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'Dapat gamitin ang useAuthClient sa loob ng isang AuthProvider',
  'angular.error.oauthFailed': 'Nabigo ang pag-login sa OAuth',
  'angular.error.unsupportedMethod': 'Hindi sinusuportahang pamamaraan: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'Dapat gamitin ang useStateProvider sa loob ng isang StateProvider',

  'angular.error.useEditorOutsideProvider':
    'Ang useEditorProvider ay dapat gamitin sa loob ng EditorProvider',
  'angular.error.useHttpOutsideProvider':
    'Ang useHttpClient ay dapat gamitin sa loob ng HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'Ang useLoggerProvider ay dapat gamitin sa loob ng LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'Ang usePreviewProvider ay dapat gamitin sa loob ng PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Walang router dito. Idagdag ang `provideMoleculeRouter()` mula sa routing bond (`@molecule/app-routing-angular-router`) sa mga provider ng app, pagkatapos ng `provideRouter(routes)` ng Angular, o ipasa ang `router` sa `provideMolecule`.',
  'angular.error.noRoutedView':
    'Walang routed view na maire-render dito ang routing bond na ito: ipasa na lang ang page bilang mga child.',
  'angular.error.useStorageOutsideProvider':
    'Ang useStorageProvider ay dapat gamitin sa loob ng StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'Ang useThemeProvider ay dapat gamitin sa loob ng ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'Ang useWorkspaceProvider ay dapat gamitin sa loob ng WorkspaceProvider',
}
