import type { AngularTranslations } from './types.js'

/** Angular translations for Yoruba. */
export const yo: AngularTranslations = {
  'angular.error.useChatOutsideProvider': 'useChatProvider gbodo lo laarin ChatProvider',
  'angular.error.useAuthOutsideProvider': 'a gbọ́dọ̀ lo useAuthClient láàrín Olùpèsè Auth',
  'angular.error.oauthFailed': 'Wíwọlé OAuth kùnà',
  'angular.error.unsupportedMethod': 'Ọ̀nà tí kò ní àtìlẹ́yìn: {{method}}',
  'angular.error.useStoreOutsideProvider': 'a gbọ́dọ̀ lo useStateProvider láàrín Olùpèsè Ìpínlẹ̀ kan',

  'angular.error.useEditorOutsideProvider': 'useEditorProvider gbodo lo laarin EditorProvider',
  'angular.error.useHttpOutsideProvider': 'useHttpClient gbodo lo laarin HttpProvider',
  'angular.error.useLoggerOutsideProvider': 'useLoggerProvider gbodo lo laarin LoggerProvider',
  'angular.error.usePreviewOutsideProvider': 'usePreviewProvider gbodo lo laarin PreviewProvider',
  'angular.error.useRouterOutsideProvider':
    'Kò sí olùdarí níbí. Fi `provideMoleculeRouter()` kún un láti inú ìdè ìdarí (`@molecule/app-routing-angular-router`) sí àwọn olùpèsè ìdàrí, lẹ́yìn `provideRouter(routes)` ti Angular, tàbí kí o fi `router` sí `provideMolecule`. Tí ìdàrí náà bá ti ṣe èyí tẹ́lẹ̀, ìdè ìdarí rẹ̀ ti dàgbà ju ìdè yìí lọ: ṣe àtúnṣe rẹ̀ (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.noRoutedView':
    'Ìdè ìtọ́sọ́nà yìí kò ní ojú ìwòye tí a lè fi hàn níbí: kọjá ojú ìwé náà gẹ́gẹ́ bí ọmọdé dípò. Tí àpù náà bá ń lọ pẹ̀lú `@molecule/app-routing-angular-router`, ìdè náà ti dàgbà ju ìdè yìí lọ: ṣe àtúnṣe rẹ̀ (`npm install @molecule/app-routing-angular-router@latest`).',
  'angular.error.useStorageOutsideProvider': 'useStorageProvider gbodo lo laarin StorageProvider',
  'angular.error.useThemeOutsideProvider': 'useThemeProvider gbodo lo laarin ThemeProvider',
  'angular.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider gbodo lo laarin WorkspaceProvider',
}
