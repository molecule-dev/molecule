import type { ReactTranslations } from './types.js'

/** React translations for Icelandic. */
export const is: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion íhlutir verða að vera notaðir innan Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient verður að nota innan AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider verður að nota innan ChatProvider',
  'react.error.useEditorOutsideProvider': 'useEditorProvider verður að nota innan EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient verður að nota innan HttpProvider',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider verður að nota innan LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider verður að nota innan PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Engin leið hér. Tengdu leiðarþátt frá leiðartengingu forritsins (`BrowserRouter` frá `@molecule/app-routing-react-router`), eða sendu `router` til `MoleculeProvider`. Ef forritið gerir þetta nú þegar, þá er leiðartenging þess eldra en þessi tenging: uppfærðu hana (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Þessi leiðartenging hefur enga leiðarsýn til að birta hér: sendið síðuna sem undirsíður í staðinn. Ef appið leiðir með `@molecule/app-routing-react-router`, þá er sú tenging eldri en þessi tenging: uppfærið hana (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'useStateProvider verður að nota innan StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider verður að nota innan StorageProvider',
  'react.error.useThemeOutsideProvider': 'useThemeProvider verður að nota innan ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast verður að nota innan ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider verður að nota innan WorkspaceProvider',
  'react.error.unsupportedMethod': 'Óstudd aðferð: {{method}}',
  'react.error.oauthFailed': 'OAuth-innskráning mistókst',
}
