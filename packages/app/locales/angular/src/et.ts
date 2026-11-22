import type { AngularTranslations } from './types.js'

/** Angular translations for Estonian. */
export const et: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider tuleb kasutada ChatProvider sees',
  'angular.error.useAuthOutsideProvider': "AuthProvideri sees tuleb kasutada useAuthClient'i",
  'angular.error.oauthFailed': 'OAuthi sisselogimine ebaõnnestus',
  'angular.error.unsupportedMethod': 'Toetamata meetod: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider peab olema kasutatud StateProvider sees.',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider tuleb kasutada EditorProvider sees',
  'angular.error.useHttpOutsideProvider': 'useHttpClient tuleb kasutada HttpProvider sees',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider tuleb kasutada LoggerProvider sees',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider tuleb kasutada PreviewProvider sees',
  'angular.error.useRouterOutsideProvider':
    'Siin pole ruuterit. Lisa `provideMoleculeRouter()` marsruutimissidemest (`@molecule/app-routing-angular-router`) rakenduse pakkujatele, pärast Angulari `provideRouter(routes)` või edasta `router` `provideMolecule` ile. Kui rakendus seda juba teeb, on selle marsruutimisside vanem kui see side: uuenda seda (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Sellel marsruutimissidemel pole siin renderdamiseks marsruutitud vaadet: edasta leht hoopis lastena. Kui rakendus marsruutib `@molecule/app-routing-angular-router` abil, on see side vanem kui see side: uuenda seda (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider tuleb kasutada StorageProvider sees',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider tuleb kasutada ThemeProvider sees',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider tuleb kasutada WorkspaceProvider sees',
}
