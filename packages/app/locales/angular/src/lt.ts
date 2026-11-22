import type { AngularTranslations } from './types.js'

/** Angular translations for Lithuanian. */
export const lt: AngularTranslations = {
  'angular.error.useChatOutsideProvider':
    'useChatProvider turi būti naudojamas ChatProvider viduje',
  'angular.error.useAuthOutsideProvider':
    '„useAuthClient“ turi būti naudojamas autentifikavimo teikėjo viduje.',
  'angular.error.oauthFailed': 'OAuth prisijungimas nepavyko',
  'angular.error.unsupportedMethod': 'Nepalaikomas metodas: {{method}}',
  'angular.error.useStoreOutsideProvider':
    '„useStateProvider“ turi būti naudojamas „StateProvider“ viduje.',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider turi būti naudojamas EditorProvider viduje',
  'angular.error.useHttpOutsideProvider': 'useHttpClient turi būti naudojamas HttpProvider viduje',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider turi būti naudojamas LoggerProvider viduje',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider turi būti naudojamas PreviewProvider viduje',
  'angular.error.useRouterOutsideProvider':
    'Čia nėra maršrutizatoriaus. Pridėkite `provideMoleculeRouter()` iš maršrutizavimo jungties (`@molecule/app-routing-angular-router`) prie programos teikėjų, po „Angular“ `provideRouter(routes)`, arba perduokite `router` programai `provideMolecule`. Jei programa jau tai daro, jos maršrutizavimo jungtis yra senesnė nei šis susiejimas: atnaujinkite jį (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Šis maršruto sujungimas neturi nukreipto rodinio, kurį būtų galima čia pateikti: verčiau perduokite puslapį kaip antrinį puslapį. Jei programa maršrutizuoja su `@molecule/app-routing-angular-router`, tas sujungimas yra senesnis nei šis sujungimas: atnaujinkite jį (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider turi būti naudojamas StorageProvider viduje',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider turi būti naudojamas ThemeProvider viduje',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider turi būti naudojamas WorkspaceProvider viduje',
}
