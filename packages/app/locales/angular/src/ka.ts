import type { AngularTranslations } from './types.js'

/** Angular translations for Georgian. */
export const ka: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider უნდა გამოიყენოთ ChatProvider-ის შიგნით',
  'angular.error.useAuthOutsideProvider': 'useAuthClient უნდა იქნას გამოყენებული AuthProvider-ში',
  'angular.error.oauthFailed': 'OAuth-ში შესვლა ვერ მოხერხდა',
  'angular.error.unsupportedMethod': 'მხარდაუჭერელი მეთოდი: {{method}}',
  'angular.error.useStoreOutsideProvider':
    'useStateProvider უნდა იქნას გამოყენებული StateProvider-ში',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider უნდა გამოიყენოთ EditorProvider-ის შიგნით',
  'angular.error.useHttpOutsideProvider': 'useHttpClient უნდა გამოიყენოთ HttpProvider-ის შიგნით',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider უნდა გამოიყენოთ LoggerProvider-ის შიგნით',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider უნდა გამოიყენოთ PreviewProvider-ის შიგნით',
  'angular.error.useRouterOutsideProvider':
    'აქ როუტერი არ არის. დაამატეთ `provideMoleculeRouter()` მარშრუტიზაციის ბმიდან (`@molecule/app-routing-angular-router`) აპლიკაციის პროვაიდერებს, Angular-ის `provideRouter(routes)` ის შემდეგ, ან გადაეცით `router` `provideMolecule` ს. თუ აპლიკაცია უკვე აკეთებს ამას, მისი მარშრუტიზაციის ბმა უფრო ძველია, ვიდრე ეს ბმა: განაახლეთ იგი (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'ამ მარშრუტიზაციის ბმას არ აქვს მარშრუტიზებული ხედი აქ გამოსატანად: გვერდი გადაეცით როგორც შვილობილი. თუ აპლიკაცია მარშრუტიზირდება `@molecule/app-routing-angular-router` ით, ეს ბმა უფრო ძველია, ვიდრე ეს ბმა: განაახლეთ იგი (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider უნდა გამოიყენოთ StorageProvider-ის შიგნით',
  'angular.error.useThemeOutsideProvider':
    'useThemeProvider უნდა გამოიყენოთ ThemeProvider-ის შიგნით',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider უნდა გამოიყენოთ WorkspaceProvider-ის შიგნით',
}
