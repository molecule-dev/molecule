import type { ReactTranslations } from './types.js'

/** React translations for Hungarian. */
export const hu: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Az Accordion komponenseket Accordion-on belül kell használni',
  'react.error.useAuthOutsideProvider': 'A useAuthClient-et AuthProvider-en belül kell használni',
  'react.error.useChatOutsideProvider': 'A useChatProvider-t ChatProvider-en belül kell használni',
  'react.error.useEditorOutsideProvider':
    'A useEditorProvider-t EditorProvider-en belül kell használni',
  'react.error.useHttpOutsideProvider': 'A useHttpClient-et HttpProvider-en belül kell használni',
  'react.error.useLoggerOutsideProvider':
    'A useLoggerProvider-t LoggerProvider-en belül kell használni',
  'react.error.usePreviewOutsideProvider':
    'A usePreviewProvider-t PreviewProvider-en belül kell használni',
  'react.error.useRouterOutsideProvider':
    'Nincs itt router. Csatold fel a router komponenst az alkalmazás routing kötéséről (`BrowserRouter` a `@molecule/app-routing-react-router` ből), vagy add át `router` a `MoleculeProvider` nek.',
  'react.error.noRoutedView':
    'Ennek az útvonalválasztási kötvénynek nincs útvonalnézete, amelyet itt megjeleníthetne: ehelyett adja át az oldalt gyermekként.',
  'react.error.useStoreOutsideProvider':
    'A useStateProvider-t StateProvider-en belül kell használni',
  'react.error.useStorageOutsideProvider':
    'A useStorageProvider-t StorageProvider-en belül kell használni',
  'react.error.useThemeOutsideProvider':
    'A useThemeProvider-t ThemeProvider-en belül kell használni',
  'react.error.useToastOutsideProvider': 'A useToast-ot ToastProvider-en belül kell használni',
  'react.error.useWorkspaceOutsideProvider':
    'A useWorkspaceProvider-t WorkspaceProvider-en belül kell használni',
  'react.error.unsupportedMethod': 'Nem támogatott metódus: {{method}}',
  'react.error.oauthFailed': 'Az OAuth-bejelentkezés sikertelen',
}
