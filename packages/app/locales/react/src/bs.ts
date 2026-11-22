import type { ReactTranslations } from './types.js'

/** React translations for Bosnian. */
export const bs: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion komponente se moraju koristiti unutar Accordion-a',
  'react.error.useAuthOutsideProvider': 'useAuthClient se mora koristiti unutar AuthProvider-a',
  'react.error.useChatOutsideProvider': 'useChatProvider se mora koristiti unutar ChatProvider-a',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider se mora koristiti unutar EditorProvider-a',
  'react.error.useHttpOutsideProvider': 'useHttpClient se mora koristiti unutar HttpProvider-a',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider se mora koristiti unutar LoggerProvider-a',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider se mora koristiti unutar PreviewProvider-a',
  'react.error.useRouterOutsideProvider':
    'Ovdje nema rutera. Montirajte komponentu rutera iz veze usmjeravanja aplikacije (`BrowserRouter` iz `@molecule/app-routing-react-router`) ili proslijedite `router` do `MoleculeProvider`.',
  'react.error.noRoutedView':
    'Ova veza usmjeravanja nema usmjereni prikaz za renderiranje ovdje: umjesto toga, proslijedite stranicu kao potomke.',
  'react.error.useStoreOutsideProvider':
    'useStateProvider se mora koristiti unutar StateProvider-a',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider se mora koristiti unutar StorageProvider-a',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider se mora koristiti unutar ThemeProvider-a',
  'react.error.useToastOutsideProvider': 'useToast se mora koristiti unutar ToastProvider-a',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider se mora koristiti unutar WorkspaceProvider-a',
  'react.error.unsupportedMethod': 'Nepodržana metoda: {{method}}',
  'react.error.oauthFailed': 'Prijava putem OAuth-a nije uspjela',
}
