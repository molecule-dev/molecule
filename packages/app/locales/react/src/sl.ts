import type { ReactTranslations } from './types.js'

/** React translations for Slovenian. */
export const sl: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Komponente Accordion je treba uporabiti znotraj Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient je treba uporabiti znotraj AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider je treba uporabiti znotraj ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider je treba uporabiti znotraj EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient je treba uporabiti znotraj HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider je treba uporabiti znotraj LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider je treba uporabiti znotraj PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Tukaj ni usmerjevalnika. Priklopite komponento usmerjevalnika iz usmerjevalne vezi aplikacije (`BrowserRouter` iz `@molecule/app-routing-react-router`) ali pa `router` posredujte `MoleculeProvider`.',
  'react.error.noRoutedView':
    'Ta usmerjevalna vez nima usmerjenega pogleda za upodobitev: namesto tega posredujte stran kot podrejene elemente.',
  'react.error.useStoreOutsideProvider':
    'useStateProvider je treba uporabiti znotraj StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider je treba uporabiti znotraj StorageProvider',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider je treba uporabiti znotraj ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast je treba uporabiti znotraj ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider je treba uporabiti znotraj WorkspaceProvider',
  'react.error.unsupportedMethod': 'Nepodprta metoda: {{method}}',
  'react.error.oauthFailed': 'Prijava z OAuth ni uspela',
}
