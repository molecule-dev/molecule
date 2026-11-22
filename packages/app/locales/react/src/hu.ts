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
    'Nincs itt router. Csatold fel a router komponenst az alkalmazás útvonalválasztási köteléből (`BrowserRouter` `@molecule/app-routing-react-router` ből), vagy add át `router` a `MoleculeProvider` nek. Ha az alkalmazás már ezt teszi, akkor az útvonalválasztási köteléke régebbi, mint ez a kötés: frissítsd (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Ennek az útvonalválasztási köteléknek nincs útvonalnézete a megjelenítéshez: ehelyett add át az oldalakat gyermekként. Ha az alkalmazás `@molecule/app-routing-react-router` irányít, akkor ez a kötelék régebbi, mint ez a kötvény: frissítsd (`npm install @molecule/app-routing-react-router@latest`).',
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
