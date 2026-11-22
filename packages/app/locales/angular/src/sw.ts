import type { AngularTranslations } from './types.js'

/** Angular translations for Swahili. */
export const sw: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider lazima utumike ndani ya ChatProvider',
  'angular.error.useAuthOutsideProvider': 'useAuthClient lazima itumike ndani ya AuthProvider',
  'angular.error.oauthFailed': 'Kuingia kwa OAuth kumeshindwa',
  'angular.error.unsupportedMethod': 'Mbinu isiyoungwa mkono: {{method}}',
  'angular.error.useStoreOutsideProvider': 'useStateProvider lazima itumike ndani ya StateProvider',

  'angular.error.useEditorOutsideProvider':
    'useEditorProvider lazima utumike ndani ya EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient lazima utumike ndani ya HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'useLoggerProvider lazima utumike ndani ya LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'usePreviewProvider lazima utumike ndani ya PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Hakuna kipanga njia hapa. Ongeza `provideMoleculeRouter()` kutoka kwa dhamana ya uelekezaji (`@molecule/app-routing-angular-router`) kwa watoa huduma wa programu, baada ya `provideRouter(routes)` ya Angular, au pitisha `router` hadi `provideMolecule`. Ikiwa programu tayari inafanya hivi, dhamana yake ya uelekezaji ni ya zamani kuliko dhamana hii: isasishe (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Kifungo hiki cha uelekezaji hakina mwonekano wa kuelekeza hapa: pitisha ukurasa kama watoto badala yake. Ikiwa programu itaelekeza na `@molecule/app-routing-angular-router`, kifungo hicho ni cha zamani kuliko hiki cha kuunganisha: kisasishe (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider':
    'useStorageProvider lazima utumike ndani ya StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider lazima utumike ndani ya ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider lazima utumike ndani ya WorkspaceProvider',
}
