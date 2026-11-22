import type { AngularTranslations } from './types.js'

/** Angular translations for Romanian. */
export const ro: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider trebuie utilizat în interiorul unui ChatProvider',
  'angular.error.useAuthOutsideProvider':
    'useAuthClient trebuie utilizat în cadrul unui AuthProvider',
  'angular.error.oauthFailed': 'Conectarea OAuth a eșuat',
  'angular.error.unsupportedMethod': 'Metodă neacceptată: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider trebuie utilizat în cadrul unui StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider trebuie utilizat în interiorul unui EditorProvider',
  'angular.error.useHttpOutsideProvider':
    'useHttpClient trebuie utilizat în interiorul unui HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider trebuie utilizat în interiorul unui LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider trebuie utilizat în interiorul unui PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Nu există router aici. Adăugați `provideMoleculeRouter()` din legătura de rutare (`@molecule/app-routing-angular-router`) la furnizorii aplicației, după `provideRouter(routes)` din Angular sau transmiteți `router` către `provideMolecule`. Dacă aplicația face deja acest lucru, legătura sa de rutare este mai veche decât această legare: actualizați-o (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Această legătură de rutare nu are o vizualizare rutată de redat aici: transmiteți pagina ca fiu în schimb. Dacă aplicația rutați cu `@molecule/app-routing-angular-router`, acea legătură este mai veche decât această legătură: actualizați-o (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider trebuie utilizat în interiorul unui StorageProvider',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider trebuie utilizat în interiorul unui ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider trebuie utilizat în interiorul unui WorkspaceProvider',
}
