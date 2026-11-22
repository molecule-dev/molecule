import type { ReactTranslations } from './types.js'

/** React translations for Dutch. */
export const nl: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion-componenten moeten binnen een Accordion worden gebruikt',
  'react.error.useAuthOutsideProvider':
    'useAuthClient moet binnen een AuthProvider worden gebruikt',
  'react.error.useChatOutsideProvider':
    'useChatProvider moet binnen een ChatProvider worden gebruikt',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider moet binnen een EditorProvider worden gebruikt',
  'react.error.useHttpOutsideProvider':
    'useHttpClient moet binnen een HttpProvider worden gebruikt',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider moet binnen een LoggerProvider worden gebruikt',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider moet binnen een PreviewProvider worden gebruikt',
  'react.error.useRouterOutsideProvider':
    'Hier is geen router aanwezig. Monteer een routercomponent vanuit de routing bond van de app (`BrowserRouter` van `@molecule/app-routing-react-router`), of geef `router` door aan `MoleculeProvider`.',
  'react.error.noRoutedView':
    'Deze routing bond heeft geen gerouteerde view om hier weer te geven: geef de pagina in plaats daarvan door als children.',
  'react.error.useStoreOutsideProvider':
    'useStateProvider moet binnen een StateProvider worden gebruikt',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider moet binnen een StorageProvider worden gebruikt',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider moet binnen een ThemeProvider worden gebruikt',
  'react.error.useToastOutsideProvider': 'useToast moet binnen een ToastProvider worden gebruikt',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider moet binnen een WorkspaceProvider worden gebruikt',
  'react.error.unsupportedMethod': 'Niet-ondersteunde methode: {{method}}',
  'react.error.oauthFailed': 'Inloggen met OAuth is mislukt',
}
