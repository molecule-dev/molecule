import type { ReactTranslations } from './types.js'

/** React translations for German. */
export const de: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion-Komponenten müssen innerhalb eines Accordion verwendet werden',
  'react.error.useAuthOutsideProvider':
    'useAuthClient muss innerhalb eines AuthProvider verwendet werden',
  'react.error.useChatOutsideProvider':
    'useChatProvider muss innerhalb eines ChatProvider verwendet werden',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider muss innerhalb eines EditorProvider verwendet werden',
  'react.error.useHttpOutsideProvider':
    'useHttpClient muss innerhalb eines HttpProvider verwendet werden',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider muss innerhalb eines LoggerProvider verwendet werden',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider muss innerhalb eines PreviewProvider verwendet werden',
  'react.error.useRouterOutsideProvider':
    'Hier gibt es keinen Router. Binden Sie eine Router-Komponente aus dem Routing-Bond der App ein (`BrowserRouter` aus `@molecule/app-routing-react-router`), oder übergeben Sie `router` an `MoleculeProvider`.',
  'react.error.noRoutedView':
    'Dieser Routing-Bond hat keine geroutete Ansicht, die hier gerendert werden kann: Übergeben Sie die Seite stattdessen als Kindseite.',
  'react.error.useStoreOutsideProvider':
    'useStateProvider muss innerhalb eines StateProvider verwendet werden',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider muss innerhalb eines StorageProvider verwendet werden',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider muss innerhalb eines ThemeProvider verwendet werden',
  'react.error.useToastOutsideProvider':
    'useToast muss innerhalb eines ToastProvider verwendet werden',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider muss innerhalb eines WorkspaceProvider verwendet werden',
  'react.error.unsupportedMethod': 'Nicht unterstützte Methode: {{method}}',
  'react.error.oauthFailed': 'OAuth-Anmeldung fehlgeschlagen',
}
