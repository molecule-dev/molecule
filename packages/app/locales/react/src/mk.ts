import type { ReactTranslations } from './types.js'

/** React translations for Macedonian. */
export const mk: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Компонентите Accordion мора да се користат внатре во Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient мора да се користи внатре во AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider мора да се користи внатре во ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider мора да се користи внатре во EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient мора да се користи внатре во HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider мора да се користи внатре во LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider мора да се користи внатре во PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Нема рутер овде. Монтирајте компонента на рутер од врската за рутирање на апликацијата (`BrowserRouter` од `@molecule/app-routing-react-router`), или предадете го `router` на `MoleculeProvider`. Ако апликацијата веќе го прави ова, нејзината врска за рутирање е постара од ова поврзување: ажурирајте го (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Оваа врска за насочување нема рутиран приказ за рендерирање тука: наместо тоа, пренесете ја страницата како деца. Ако апликацијата се насочува со `@molecule/app-routing-react-router`, таа врска е постара од ова врзување: ажурирајте го (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider':
    'useStateProvider мора да се користи внатре во StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider мора да се користи внатре во StorageProvider',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider мора да се користи внатре во ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast мора да се користи внатре во ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider мора да се користи внатре во WorkspaceProvider',
  'react.error.unsupportedMethod': 'Неподдржан метод: {{method}}',
  'react.error.oauthFailed': 'Најавата преку OAuth не успеа',
}
