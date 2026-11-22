import type { AngularTranslations } from './types.js'

/** Angular translations for Welsh. */
export const cy: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'Rhaid defnyddio useChatProvider o fewn ChatProvider',
  'angular.error.useAuthOutsideProvider': 'Rhaid defnyddio useAuthClient o fewn Darparwr Awdurdodi',
  'angular.error.oauthFailed': 'Methodd mewngofnodi OAuth',
  'angular.error.unsupportedMethod': 'Dull heb ei gefnogi: {{method}}',
  'angular.error.useStoreOutsideProvider': 'Rhaid defnyddio useStateProvider o fewn StateProvider',

  'angular.error.useEditorOutsideProvider':
    'Rhaid defnyddio useEditorProvider o fewn EditorProvider',
  'angular.error.useHttpOutsideProvider': 'Rhaid defnyddio useHttpClient o fewn HttpProvider',
  'angular.error.useLoggerOutsideProvider':
    'Rhaid defnyddio useLoggerProvider o fewn LoggerProvider',
  'angular.error.usePreviewOutsideProvider':
    'Rhaid defnyddio usePreviewProvider o fewn PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    "Dim llwybrydd yma. Ychwanegwch `provideMoleculeRouter()` o'r bond llwybro (`@molecule/app-routing-angular-router`) at ddarparwyr yr ap, ar ôl `provideRouter(routes)` Angular , neu pasiwch `router` i `provideMolecule`.",
  'angular.error.noRoutedView':
    "Nid oes gan y bond llwybro hwn olygfa llwybro i'w rendro yma: pasiwch y dudalen fel plant yn lle hynny.",
  'angular.error.useStorageOutsideProvider':
    'Rhaid defnyddio useStorageProvider o fewn StorageProvider',
  'angular.error.useThemeOutsideProvider': 'Rhaid defnyddio useThemeProvider o fewn ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'Rhaid defnyddio useWorkspaceProvider o fewn WorkspaceProvider',
}
