import type { ReactTranslations } from './types.js'

/** React translations for Polish. */
export const pl: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Komponenty Accordion muszą być używane wewnątrz Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient musi być używany wewnątrz AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider musi być używany wewnątrz ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider musi być używany wewnątrz EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient musi być używany wewnątrz HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider musi być używany wewnątrz LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider musi być używany wewnątrz PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Brak routera. Zamontuj komponent routera z połączenia routingu aplikacji (`BrowserRouter` z `@molecule/app-routing-react-router`) lub przekaż `router` do `MoleculeProvider`.',
  'react.error.noRoutedView':
    'To powiązanie routingu nie ma widoku routingu do renderowania w tym miejscu: zamiast tego przekaż stronę jako stronę potomną.',
  'react.error.useStoreOutsideProvider': 'useStateProvider musi być używany wewnątrz StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider musi być używany wewnątrz StorageProvider',
  'react.error.useThemeOutsideProvider': 'useThemeProvider musi być używany wewnątrz ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast musi być używany wewnątrz ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider musi być używany wewnątrz WorkspaceProvider',
  'react.error.unsupportedMethod': 'Nieobsługiwana metoda: {{method}}',
  'react.error.oauthFailed': 'Logowanie przez OAuth nie powiodło się',
}
