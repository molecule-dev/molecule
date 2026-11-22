import type { ReactTranslations } from './types.js'

/** React translations for Romanian. */
export const ro: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Componentele Accordion trebuie utilizate în interiorul unui Accordion',
  'react.error.useAuthOutsideProvider':
    'useAuthClient trebuie utilizat în interiorul unui AuthProvider',
  'react.error.useChatOutsideProvider':
    'useChatProvider trebuie utilizat în interiorul unui ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider trebuie utilizat în interiorul unui EditorProvider',
  'react.error.useHttpOutsideProvider':
    'useHttpClient trebuie utilizat în interiorul unui HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider trebuie utilizat în interiorul unui LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider trebuie utilizat în interiorul unui PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Nu există router aici. Montați o componentă de router din legătura de rutare a aplicației (`BrowserRouter` din `@molecule/app-routing-react-router`) sau transmiteți `router` către `MoleculeProvider`.',
  'react.error.noRoutedView':
    'Această legătură de rutare nu are o vedere rutată de redat aici: transmiteți pagina ca fiu în schimb.',
  'react.error.useStoreOutsideProvider':
    'useStateProvider trebuie utilizat în interiorul unui StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider trebuie utilizat în interiorul unui StorageProvider',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider trebuie utilizat în interiorul unui ThemeProvider',
  'react.error.useToastOutsideProvider':
    'useToast trebuie utilizat în interiorul unui ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider trebuie utilizat în interiorul unui WorkspaceProvider',
  'react.error.unsupportedMethod': 'Metodă neacceptată: {{method}}',
  'react.error.oauthFailed': 'Autentificarea OAuth a eșuat',
}
