import type { ReactTranslations } from './types.js'

/** React translations for Lithuanian. */
export const lt: ReactTranslations = {
  'react.error.useAccordionOutsideProvider':
    'Accordion komponentai turi būti naudojami Accordion viduje',
  'react.error.useAuthOutsideProvider': 'useAuthClient turi būti naudojamas AuthProvider viduje',
  'react.error.useChatOutsideProvider': 'useChatProvider turi būti naudojamas ChatProvider viduje',
  'react.error.useEditorOutsideProvider':
    'useEditorProvider turi būti naudojamas EditorProvider viduje',
  'react.error.useHttpOutsideProvider': 'useHttpClient turi būti naudojamas HttpProvider viduje',
  'react.error.useLoggerOutsideProvider':
    'useLoggerProvider turi būti naudojamas LoggerProvider viduje',
  'react.error.usePreviewOutsideProvider':
    'usePreviewProvider turi būti naudojamas PreviewProvider viduje',
  'react.error.useRouterOutsideProvider':
    'Čia nėra maršrutizatoriaus. Prijunkite maršrutizatoriaus komponentą prie programos maršrutizavimo jungties (`BrowserRouter` iš `@molecule/app-routing-react-router`) arba perduokite `router` `MoleculeProvider`. Jei programa jau tai daro, jos maršrutizavimo jungtis yra senesnė nei šis susiejimas: atnaujinkite jį (`npm install @molecule/app-routing-react-router@latest` “).',
  'react.error.noRoutedView':
    'Šis maršruto parinkimo ryšys neturi nukreipto rodinio, kurį būtų galima čia pateikti: verčiau perduokite puslapį kaip antrinį puslapį. Jei programa maršrutizuoja su `@molecule/app-routing-react-router`, tas ryšys yra senesnis nei šis sujungimas: atnaujinkite jį (`npm install @molecule/app-routing-react-router@latest`).',
  'react.error.useStoreOutsideProvider':
    'useStateProvider turi būti naudojamas StateProvider viduje',
  'react.error.useStorageOutsideProvider':
    'useStorageProvider turi būti naudojamas StorageProvider viduje',
  'react.error.useThemeOutsideProvider':
    'useThemeProvider turi būti naudojamas ThemeProvider viduje',
  'react.error.useToastOutsideProvider': 'useToast turi būti naudojamas ToastProvider viduje',
  'react.error.useWorkspaceOutsideProvider':
    'useWorkspaceProvider turi būti naudojamas WorkspaceProvider viduje',
  'react.error.unsupportedMethod': 'Nepalaikomas metodas: {{method}}',
  'react.error.oauthFailed': 'Prisijungti per OAuth nepavyko',
}
