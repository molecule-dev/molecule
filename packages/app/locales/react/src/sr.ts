import type { ReactTranslations } from './types.js'

/** React translations for Serbian. */
export const sr: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion компоненте морају да се користе унутар Accordion-а',
  'react.error.useAuthOutsideProvider': 'useAuthClient мора да се користи унутар AuthProvider-а',
  'react.error.useChatOutsideProvider': 'useChatProvider мора да се користи унутар ChatProvider-а',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider мора да се користи унутар EditorProvider-а',
  'react.error.useHttpOutsideProvider': 'useHttpClient мора да се користи унутар HttpProvider-а',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider мора да се користи унутар LoggerProvider-а',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider мора да се користи унутар PreviewProvider-а',
  'react.error.useRouterOutsideProvider':
    'Овде нема рутера. Монтирајте компоненту рутера из везе рутирања апликације (`BrowserRouter` из `@molecule/app-routing-react-router`) или проследите `router` до `MoleculeProvider`. Ако апликација већ ово ради, њена веза рутирања је старија од ове везе: ажурирајте је (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Ова веза рутирања нема усмерен приказ за приказивање овде: уместо тога проследите страницу као потомке. Ако апликација рутира са `@molecule/app-routing-react-router`, та веза је старија од ове везе: ажурирајте је (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider':
    'useStateProvider мора да се користи унутар StateProvider-а',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider мора да се користи унутар StorageProvider-а',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider мора да се користи унутар ThemeProvider-а',
  'react.error.useToastOutsideProvider': 'useToast мора да се користи унутар ToastProvider-а',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider мора да се користи унутар WorkspaceProvider-а',
  'react.error.unsupportedMethod': 'Неподржан метод: {{method}}',
  'react.error.oauthFailed': 'Пријава преко OAuth-а није успела',
}
