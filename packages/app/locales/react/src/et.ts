import type { ReactTranslations } from './types.js'

/** React translations for Estonian. */
export const et: ReactTranslations = {
  'react.error.useAccordionOutsideProvider': 'Accordion komponente tuleb kasutada Accordion sees',
  'react.error.useAuthOutsideProvider': 'useAuthClient tuleb kasutada AuthProvider sees',
  'react.error.useChatOutsideProvider': 'useChatProvider tuleb kasutada ChatProvider sees',
  'react.error.useEditorOutsideProvider': 'useEditorProvider tuleb kasutada EditorProvider sees',
  'react.error.useHttpOutsideProvider': 'useHttpClient tuleb kasutada HttpProvider sees',
  'react.error.useLoggerOutsideProvider': 'useLoggerProvider tuleb kasutada LoggerProvider sees',
  'react.error.usePreviewOutsideProvider': 'usePreviewProvider tuleb kasutada PreviewProvider sees',
  'react.error.useRouterOutsideProvider':
    'Siin pole ruuterit. Ühenda ruuteri komponent rakenduse marsruutimissidemest (`BrowserRouter` failist `@molecule/app-routing-react-router`) või edasta `router` kasutajale `MoleculeProvider`. Kui rakendus seda juba teeb, on selle marsruutimisside sellest sidemest vanem: uuenda seda (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.noRoutedView':
    'Sellel marsruutimissidemel pole siin renderdamiseks marsruutitud vaadet: edasta leht hoopis lastena. Kui rakendus marsruutib `@molecule/app-routing-react-router` abil, on see side sellest sidumisest vanem: uuenda seda (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider': 'useStateProvider tuleb kasutada StateProvider sees',
  'react.error.useStorageOutsideProvider': 'useStorageProvider tuleb kasutada StorageProvider sees',
  'react.error.useThemeOutsideProvider': 'useThemeProvider tuleb kasutada ThemeProvider sees',
  'react.error.useToastOutsideProvider': 'useToast tuleb kasutada ToastProvider sees',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider tuleb kasutada WorkspaceProvider sees',
  'react.error.unsupportedMethod': 'Toetamata meetod: {{method}}',
  'react.error.oauthFailed': 'OAuthi sisselogimine ebaõnnestus',
}
