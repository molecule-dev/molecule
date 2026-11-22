import type { ReactTranslations } from './types.js'

/** React translations for Latvian. */
export const lv: ReactTranslations = {
  'react.error.useAccordionOutsideProvider': 'Accordion komponentes jāizmanto Accordion ietvaros',
  'react.error.useAuthOutsideProvider': 'useAuthClient jāizmanto AuthProvider ietvaros',
  'react.error.useChatOutsideProvider': 'useChatProvider jāizmanto ChatProvider ietvaros',
  'react.error.useEditorOutsideProvider': 'useEditorProvider jāizmanto EditorProvider ietvaros',
  'react.error.useHttpOutsideProvider': 'useHttpClient jāizmanto HttpProvider ietvaros',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider jāizmanto LoggerProvider ietvaros',
  'react.error.usePreviewOutsideProvider': 'usePreviewProvider jāizmanto PreviewProvider ietvaros',
  'react.error.useRouterOutsideProvider':
    'Šeit nav maršrutētāja. Pievienojiet maršrutētāja komponentu no lietotnes maršrutēšanas saites (`BrowserRouter` no `@molecule/app-routing-react-router`) vai nodojiet `router` uz `MoleculeProvider`. Ja lietotne to jau dara, tās maršrutēšanas saite ir vecāka par šo saistījumu: atjauniniet to (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Šai maršrutēšanas saitei nav maršrutēta skata, ko šeit renderēt: tā vietā nododiet lapu kā bērnlapas. Ja lietotne maršrutē ar `@molecule/app-routing-react-router`, šī saite ir vecāka par šo saistīšanu: atjauniniet to (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'useStateProvider jāizmanto StateProvider ietvaros',
  'react.error.useStorageOutsideProvider': 'useStorageProvider jāizmanto StorageProvider ietvaros',
  'react.error.useThemeOutsideProvider': 'useThemeProvider jāizmanto ThemeProvider ietvaros',
  'react.error.useToastOutsideProvider': 'useToast jāizmanto ToastProvider ietvaros',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider jāizmanto WorkspaceProvider ietvaros',
  'react.error.unsupportedMethod': 'Neatbalstīta metode: {{method}}',
  'react.error.oauthFailed': 'OAuth pieteikšanās neizdevās',
}
