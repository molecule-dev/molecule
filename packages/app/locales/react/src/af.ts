import type { ReactTranslations } from './types.js'

/** React translations for af. */
export const af: Partial<ReactTranslations> = {
  'react.error.unsupportedMethod': 'Nie-ondersteunde metode: {{method}}',
  'react.error.useAccordionOutsideProvider':
    "Trekklavierkomponente moet binne 'n trekklavier gebruik word",
  'react.error.useAuthOutsideProvider': "useAuthClient moet binne 'n AuthProvider gebruik word",
  'react.error.useChatOutsideProvider': "useChatProvider moet binne 'n ChatProvider gebruik word.",
  'react.error.useEditorOutsideProvider':
    "useEditorProvider moet binne 'n EditorProvider gebruik word.",
  'react.error.useHttpOutsideProvider': "useHttpClient moet binne 'n HttpProvider gebruik word",
  'react.error.useLoggerOutsideProvider':
    "useLoggerProvider moet binne 'n LoggerProvider gebruik word",
  'react.error.usePreviewOutsideProvider':
    "usePreviewProvider moet binne 'n PreviewProvider gebruik word",
  'react.error.useRouterOutsideProvider':
    "Geen router hier nie. Monteer 'n routerkomponent vanaf die toepassing se roeteringsverbinding (`BrowserRouter` vanaf `@molecule/app-routing-react-router`), of gee `router` deur aan `MoleculeProvider`.",
  'react.error.noRoutedView':
    'Hierdie roeteringsbinding het geen gerouteerde aansig om hier te lewer nie: gee eerder die bladsy as kinders deur.',
  'react.error.useStoreOutsideProvider':
    "useStateProvider moet binne 'n StateProvider gebruik word.",
  'react.error.useStorageOutsideProvider':
    "useStorageProvider moet binne 'n StorageProvider gebruik word.",
  'react.error.useThemeOutsideProvider':
    "useThemeProvider moet binne 'n Temaverskaffer gebruik word",
  'react.error.useToastOutsideProvider': "useToast moet binne 'n ToastProvider gebruik word",
  'react.error.useWorkspaceOutsideProvider':
    "useWorkspaceProvider moet binne 'n Werkruimteverskaffer gebruik word.",
  'react.error.oauthFailed': 'OAuth-aanmelding het misluk',
}
