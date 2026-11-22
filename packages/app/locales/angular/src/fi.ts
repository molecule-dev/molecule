import type { AngularTranslations } from './types.js'

/** Angular translations for Finnish. */
export const fi: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider on käytettävä ChatProvider-komponentin sisällä',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient-ominaisuutta on käytettävä AuthProvider-ominaisuuden sisällä.',
  'angular.error.oauthFailed': 'OAuth-kirjautuminen epäonnistui',
  'angular.error.unsupportedMethod': 'Ei-tuettu menetelmä: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider-arvoa on käytettävä StateProvider-arvoa noudattaen.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider on käytettävä EditorProvider-komponentin sisällä',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient on käytettävä HttpProvider-komponentin sisällä',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider on käytettävä LoggerProvider-komponentin sisällä',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider on käytettävä PreviewProvider-komponentin sisällä',
  'angular.error.useRouterOutsideProvider':
    'Ei reititintä. Lisää `provideMoleculeRouter()` reitityslinkistä (`@molecule/app-routing-angular-router`) sovelluksen tarjoajiin Angularin `provideRouter(routes)` jälkeen tai välitä `router` `provideMolecule` metodille.',
  'angular.error.noRoutedView':
    'Tällä reitityslinkillä ei ole reititettyä näkymää, jota voisi renderöidä tässä: välitä sivu sen sijaan alisivuina.',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider on käytettävä StorageProvider-komponentin sisällä',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider on käytettävä ThemeProvider-komponentin sisällä',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider on käytettävä WorkspaceProvider-komponentin sisällä',
}
