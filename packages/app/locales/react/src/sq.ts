import type { ReactTranslations } from './types.js'

/** React translations for Albanian. */
export const sq: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Komponentët Accordion duhet të përdoren brenda një Accordion',
  'react.error.useAuthOutsideProvider': 'useAuthClient duhet të përdoret brenda një AuthProvider',
  'react.error.useChatOutsideProvider': 'useChatProvider duhet të përdoret brenda një ChatProvider',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider duhet të përdoret brenda një EditorProvider',
  'react.error.useHttpOutsideProvider': 'useHttpClient duhet të përdoret brenda një HttpProvider',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider duhet të përdoret brenda një LoggerProvider',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider duhet të përdoret brenda një PreviewProvider',
  'react.error.useRouterOutsideProvider':
    'Nuk ka router këtu. Montoni një komponent routeri nga lidhja e routing-ut të aplikacionit (`BrowserRouter` nga `@molecule/app-routing-react-router`), ose kaloni `router` te `MoleculeProvider`. Nëse aplikacioni e bën tashmë këtë, lidhja e tij e routing-ut është më e vjetër se kjo lidhje: përditësojeni atë (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    "Kjo lidhje rrugëzimi nuk ka pamje të rrugëzuar për t'u paraqitur këtu: kalojeni faqen si fëmijë në vend të kësaj. Nëse aplikacioni rrugëzon me `@molecule/app-routing-react-router`, ajo lidhje është më e vjetër se kjo lidhje: përditësojeni atë (`npm install @molecule/app-routing-react-router@latest`).",
  'react.error.useStoreOutsideProvider':
    'useStateProvider duhet të përdoret brenda një StateProvider',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider duhet të përdoret brenda një StorageProvider',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider duhet të përdoret brenda një ThemeProvider',
  'react.error.useToastOutsideProvider': 'useToast duhet të përdoret brenda një ToastProvider',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider duhet të përdoret brenda një WorkspaceProvider',
  'react.error.unsupportedMethod': 'Metodë e pambështetur: {{method}}',
  'react.error.oauthFailed': 'Hyrja me OAuth dështoi',
}
